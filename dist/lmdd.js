///todo: touch support,pointer styling, touch support, wrappping it up, event triggering, vuejs app (layoutbuilder),embed options
var lmdd = (function() {
    var options = {
        containerClass:false,
        fixedItemClass:false,//fixed items can't be draggable
        draggableItemClass:false,
        handleClass:false,
        regulateMouseOver:false,
        mirrorMaxHeight:100,
        mirrorMaxWidth:300,
        revert:false,
        clone:false
    };
    var origin = {
        container:{},
        nextSibling: {},
        clone:{}
    };
    var scroll = {
        lastX:window.scrollX,
        lastY:window.scrollY,
        get deltaX(){
            return window.scrollX - this.lastX;
        },
        get deltaY(){
            return window.scrollY - this.lastY;
        }
    };
    var dragOffset = {
        x:0,
        y:0
    }
    var scope = {};
    var draggableClass = 'item'; //add lmdd-draggable
    var handleClass = ''; //add lmdd-handle
    var containerClass = 'nestable'; //add lmdd-container
    var draggedElement = false;
    var draggedClone = false;
    var mirror = false;
    var mouseLocation = {
        event:{},
        lastEvent:{},
        container:false,
        get position() {
            return getPosition(this.coordinates, this.event.clientY, this.event.clientX)
        },
        get coordinates() {
            return ((this.container) ? getCoordinates(this.container) : false);
        },
        get speed(){
            var time = this.event.timeStamp - this.lastEvent.timeStamp;
            var distance = Math.sqrt(Math.pow(this.event.pageY - this.lastEvent.pageY, 2) + Math.pow(this.event.pageX - this.lastEvent.pageX, 2));
            this.lastEvent = this.event;
            return distance/time;
        }
    };
    // helper functions
    var cleanNode = function(node) {//clean empty nodes
        for (var n = 0; n < node.childNodes.length; n++) {
            var child = node.childNodes[n];
            if (
                child.nodeType === 8 ||
                (child.nodeType === 3 && !/\S/.test(child.nodeValue))
            ) {
                node.removeChild(child);
                n--;
            } else if (child.nodeType === 1) {
                cleanNode(child);
            };
        };
    };
    var getOffset = function(el1, el2) {
        var rect1 = el1.getBoundingClientRect(),
            rect2 = el2.getBoundingClientRect();
        var offset = {
            x: rect1.left - rect2.left,
            y: rect1.top - rect2.top
        };
        return offset;
    };
    var setElementIndex = function(el, isRoot) {
        el.dataset.lmddindex = (isRoot) ? 'root' : getIndex(el);
        el.childNodes.forEach(function(node) {
            setElementIndex(node, false);
        });
    };
    var deleteReference = function(el) {
        delete(el.cloneRef);
        delete(el.original);
        el.childNodes.forEach(function(node) {
            deleteReference(node);
        });
    };
    var getIndex = function(el) {
        var index = [];
        while (el.dataset.lmddindex !== 'root') {
            index.unshift(Array.prototype.indexOf.call(el.parentNode.childNodes, el));
            el = el.parentElement;
        }
        return index;
    };
    var animateElement = function (el){
        if(el.nodeType === 1){
            animateNode (el);
        }
        el.childNodes.forEach(function(node){
            animateElement(node);
        });
    };
    var animateNode = function(elNode) {
        var cloneNode = elNode.cloneRef;
        var elRect = elNode.getBoundingClientRect();
        cloneNode.style.position = 'absolute';
        cloneNode.style.width = elRect.width + 'px';
        cloneNode.style.height = elRect.height + 'px';
        if (elNode === scope) {
            cloneNode.style.top = elRect.top + window.scrollY + 'px';
            cloneNode.style.left = elRect.left + window.scrollX + 'px';
        } else {
            var offset = (elNode === draggedElement)?getOffset(elNode, scope):getOffset(elNode, elNode.parentNode);
            cloneNode.style.transform = 'translate(' + offset.x + 'px, ' + offset.y + 'px)';
        }
    };
    var getElement = function(index, root) {
        var el = root;
        for (var i = 0; i < index.length; i++) {
            el = el.childNodes[index[i]];
        }
        return el;
    };
    var getCoordinates = function(el) {
        var coordinates = [];
        el.childNodes.forEach(function(node, index) { //replace with getelementbyclassname
            if (node.nodeType === 1){
                var coordinate = node.getBoundingClientRect();
                coordinate.index = index;
                if (!node.classList.contains('fixed')){
                    coordinates.push(coordinate);
                }
            }
        });
        return coordinates;
    };
    var getPosition = function(coordinates, top, left) {
        var length = coordinates.length;
        if (length === 0){return null}
        var lastAbove = 0;
        var firstBelow = 0;
        var firstRight = 0;
        var position = -1;
        for (; lastAbove <= length; lastAbove++) {
            if (lastAbove === length) {
                lastAbove--;
                break;
            } else if (coordinates[lastAbove].bottom > top) {
                lastAbove--;
                break;
            }
        };
        for (; firstBelow <= length; firstBelow++) {
            if (firstBelow === length) {
                break;
            } else if (coordinates[firstBelow].top > top) {
                break;
            }
        };
        firstRight = lastAbove + 1;
        for (; firstRight <= firstBelow; firstRight++) {
            if (firstRight === firstBelow) {
                position = firstRight;
                break;
            } else if (coordinates[firstRight].left > left) {
                position = firstRight;
                break;
            }
        };
        if (position === length) {
            return coordinates[position-1].index + 1;
        }
        return coordinates[position].index;
    };
    var dragEnded = function(event) {
        if (draggedElement) {
            unsetMirror();
            document.body.classList.toggle('unselectable');
            draggedElement.classList.toggle('lmdd-hidden');//reverse
            unsetAnimationLayer();
            scope = false;
            draggedElement = false;
            draggedClone = false;
            document.removeEventListener("mousemove", mouseLocationUpdated); //reverse
            document.removeEventListener("scroll", scrollEvent);//reverse
            window.removeEventListener("mouseup", dragEnded); //reverse
        }
    }
    var dragStarted = function(event) {
        if (event.button === 0) {
            scope = this;
            mouseLocation.event = event;
            scroll.lastX = window.scrollX;
            scroll.lastY = window.scrollY;
            var clone = false;
            var target = event.target;
            while (!target.classList.contains('lmdd-draggable')){
                target = target.parentNode;
                if (target === scope){
                    return false;
                };
            };
            dragOffset.x = event.clientX - target.getBoundingClientRect().left;
            dragOffset.y = event.clientY - target.getBoundingClientRect().top;
            if(this.lmddOptions.handleClass){
                if (!event.target.classList.contains('handle')){
                    return false;
                }
            }
            document.body.classList.toggle('unselectable');///reverse
            if (clone){
                origin.clone = target.cloneNode(true);
                target.parentNode.insertBefore(origin.clone,target);
            }
            setAnimationLayer();
            draggedElement = target;//reverse
            origin.container = target.parentNode;
            origin.nextSibling = target.nextSibling;
            setDraggedClone();//reverseVV
            setMirror();//reverseVV
            draggedElement.classList.toggle('lmdd-hidden');//reverse
            document.addEventListener("mousemove", mouseLocationUpdated); //reverse
            document.addEventListener("scroll", scrollEvent);//reverse
            window.addEventListener("mouseup", dragEnded); //reverse
            // animateElement(scope);
        };
    };
    var setDraggedClone = function(el) {
        draggedClone = draggedElement.cloneRef;//reverse
        animateNode(draggedElement);
        scope.cloneRef.appendChild(draggedClone);//reverse***********for nested structures?
        animateElement(scope);
        draggedClone.classList.toggle('lmdd-dragged');//reverse
    };
    var updateMirrorLocation = function() {
        if (mirror) {
            mirror.style.top = (mouseLocation.event.pageY - parseInt(mirror.parentNode.style.top) + scroll.deltaY - dragOffset.y) + 'px';
            mirror.style.left = (mouseLocation.event.pageX - parseInt(mirror.parentNode.style.left) + scroll.deltaX - dragOffset.x) + 'px';
        }
    };
    var setMirror = function() {
        mirror = draggedClone.cloneNode(true);
        mirror.classList.toggle('lmdd-mirror');
        mirror.classList.toggle('lmdd-dragged');
        mirror.style.width = draggedClone.getBoundingClientRect().width + 'px';
        mirror.style.height = draggedClone.getBoundingClientRect().height + 'px';
        var minHeight = 100;
        var maxWidth = 500;
        var scaleX = maxWidth/draggedClone.getBoundingClientRect().width;
        var scaleY = minHeight/draggedClone.getBoundingClientRect().height;
        var scale = Math.min(1,Math.max(scaleX,scaleY));
        mirror.style.transform = 'scale(' + scale + ',' + scale + ')';
        mirror.style.transformOrigin = '0 0';
        scope.cloneRef.appendChild(mirror);
        updateMirrorLocation();
    };
    var unsetMirror = function() {
        scope.cloneRef.removeChild(mirror);
        mirror = false;
    };
    var scrollEvent = function (){
        updateMirrorLocation();
    };
    var getWrapper = function(el, wrapperClass){

    };
    var searchContainer = function(event){
        var target = event.target;
        while (!target.classList.contains('lmdd-container')){
            console.log(target);

            if (target === scope){
                return false;
                console.log('return????')
            };
            target = target.parentNode;
        };
        return target;
    };
    var mouseLocationUpdated = function(event) {
        console.log(searchContainer(event));
        if(event.path.includes(scope)){
            var i = 0;
            var el = false;
            while (event.path[i]!==scope){
                if(event.path[i].classList.contains('lmdd-container')){
                    el = event.path[i];
                    // console.log(event.path[i]);
                    break;
                };
                i++;
            }
            mouseLocation.container = el;
        }else{
            mouseLocation.container = false;
        }
        var revert = true;
        scroll.lastX = window.scrollX;
        scroll.lastY = window.scrollY;
        var location = (event.type === 'touchmove')?event.touches[0]:event;
        mouseLocation.event = (event.type === 'touchmove')?event.touches[0]:event;
        // updateLocation(location,mouseLocation);
        updateMirrorLocation();
        if ((mouseLocation.container)&&(mouseLocation.container.original)&&(draggedElement)&&(mouseLocation.speed<0.1)) {//
            mouseLocation.container.insertBefore(draggedElement, mouseLocation.container.childNodes[mouseLocation.position]);
            animateElement(scope);

        }
        else if(!mouseLocation.container&&revert){
            origin.container.insertBefore(draggedElement,origin.nextSibling);
            animateElement(scope);
        }
    };
    var createReference = function(el,clone){
        var elArray = [];
        var cloneArray = [];
        var traverse = function(el, refArray){
            refArray.push(el);
            el.childNodes.forEach(function(node){
                traverse(node, refArray);
            });
        };
        traverse(el, elArray);
        traverse(clone, cloneArray);
        for (var i=0;i<elArray.length;i++){
            elArray[i].cloneRef = cloneArray[i];
            elArray[i].original = true;
        };
    };
    var setEventHandlers = {


    };
    var unsetEventHandlers = {

    };
    var setAnimationLayer = function(){
        var clone = scope.cloneNode(true);
        clone.id += '-lmddClone';
        createReference(scope,clone);//reverseVV
        animateElement(scope);
        clone.classList.toggle('visible-layer'); //reverseVV
        scope.classList.toggle('hidden-layer'); //reverseVV
        scope.parentNode.appendChild(clone); //reverseVV
    };
    var unsetAnimationLayer = function() {
        console.log('unsetting')
        scope.parentNode.removeChild(scope.cloneRef); //reverseVV
        scope.classList.toggle('hidden-layer');
        deleteReference(scope);
    };
    var setDraggables = function(el){
        var containers = el.getElementsByClassName(el.lmddOptions.containerClass);
        if (el.classList.contains(el.lmddOptions.containerClass)) {
            el.classList.add('lmdd-container') //reverse
        };
        for (var i = 0; i < containers.length; i++) {
            containers[i].classList.add('lmdd-container'); //reverse
        };
        var draggables = el.getElementsByClassName(el.lmddOptions.draggableItemClass);
        for (var i = 0; i < draggables.length; i++) {
            draggables[i].classList.add('lmdd-draggable'); //revrese
        };
        el.addEventListener('mousedown',dragStarted,false)
    };
    var unsetDraggables = function(el){
        el.removeEventListener('mousedown',dragStarted,false)
        var draggables = el.getElementsByClassName(el.lmddOptions.draggableItemClass);
        for (var i = 0; i < draggables.length; i++) {
            draggables[i].classList.remove('lmdd-draggable'); //revrese
        };
        var containers = el.getElementsByClassName(el.lmddOptions.containerClass);
        if (el.classList.contains(el.lmddOptions.containerClass)) {
            el.classList.remove('lmdd-container') //reverse
        };
        for (var i = 0; i < containers.length; i++) {
            containers[i].classList.remove('lmdd-container'); //reverse
        };


    };
    return {
        init: function(el,lmddOptions) {
            if (!el.lmdd){
                cleanNode(el);//get rid of whitespaces
                el.lmdd = true;
                el.lmddOptions = Object.assign({}, options, lmddOptions);//create options object
                console.log(el.lmddOptions);
                setDraggables(el);
            }
        },
        kill:function(el){
            if (el.lmdd){
                console.log('unsettingdraggables')
                unsetDraggables(el);
                el.lmdd = false;
                delete(el.lmddOptions);
            }
        }

    };
})();