///todo: pointer styling, wrappping it up, event triggering, vuejs app (layoutbuilder),embed options
var lmdd = (function() {
    var scroll = {
        lastX:0,
        lastY:0,
        get deltaX(){
            return window.scrollX - this.lastX;
        },
        get deltaY(){
            return window.scrollY - this.lastY;
        }
    };
    var options = {
        containerClass:false,
        fixedItemClass:false,
        draggableItemClass:false,
        handleClass:false,
        regulateMouseOver:false,
        mirrorMaxHeight:100,
        mirrorMaxWidth:300
    };
    var getDraggable = function(el){

    };
    var scope = {};
    var protectedStyleProperties =['padding','paddingTop','paddingBottom','paddingLeft','paddingRight'];
    var draggableClass = 'item'; //add lmdd-draggable
    var handleClass = ''; //add lmdd-handle
    var containerClass = 'nestable'; //add lmdd-container
    var draggedElement = false;
    var draggedClone = false;
    var mirror = false;
    var speedTracker = {
        lastPageX: -1,
        lastPageY: -1,
        lastTimeStamp: -1,
        lastSpeed:-1,
        get speed(){
            if (this.lastTimeStamp !== mouseLocation.timeStamp){
                var time = mouseLocation.timeStamp - this.lastTimeStamp;
                var distance = Math.sqrt(Math.pow(mouseLocation.pageY - this.lastPageY, 2) + Math.pow(mouseLocation.pageX - this.lastPageX, 2));
                var speed = distance/time;
                this.lastTimeStamp = mouseLocation.timeStamp;
                this.lastPageX = mouseLocation.pageX;
                this.lastPageY = mouseLocation.pageY;
                this.lastSpeed = speed;
                return speed;
            }
            else{
                return this.lastSpeed;
            }
        }
    };
    var mouseLocation = {
        clientX: -1,
        clientY: -1,
        pageX: -1,
        pageY: -1,
        timeStamp: -1,
        get container() {
            var container = document.elementFromPoint(this.clientX, this.clientY);
            return (container) ? (container.classList.contains('lmdd-container') ? container : false) : false;
        },
        get position() {
            return getPosition(this.coordinates, this.clientY, this.clientX)
        },
        get coordinates() {
            return ((this.container) ? getCoordinates(this.container) : false);
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
            console.log('coordinates[position-1].index + 1',coordinates,position)
            return coordinates[position-1].index + 1;
        }
        return coordinates[position].index;
    };
    var dragEnded = function(event) {
        if (draggedElement) {
            document.removeEventListener("touchmove", mouseLocationUpdated, false); //reverse
            unsetMirror();
            document.body.classList.toggle('unselectable');
            draggedElement.classList.toggle('lmdd-hidden');//reverse
            scope.animation.kill();
            scope = false;
            draggedElement = false;
            draggedClone = false;
        }
    }
    var dragStarted = function(event, el) {
        // if (!event.target.classList.contains('handle')){
        //     return false;
        // }
        var target = event.target;
        while (!target.classList.contains('lmdd-draggable')){
            target = target.parentNode;
        }
        if (event.type = 'touchstart'){
            document.addEventListener("touchmove", mouseLocationUpdated, false); //reverse
        };
        if(el.lmddOptions.handleClass){

        }
        if (event.button === 0) {
            document.body.classList.toggle('unselectable');///reverse
            scope = el;//reverse
            event.stopPropagation();
            scope.animation.init();//reverseVV
            draggedElement = target;//reverse
            setDraggedClone();//reverseVV
            setMirror();//reverseVV
            draggedElement.classList.toggle('lmdd-hidden');//reverse
        };
    };
    var setDraggedClone = function(el) {
        draggedClone = draggedElement.cloneRef;//reverse
        animateNode(draggedElement);
        scope.cloneRef.appendChild(draggedClone);//reverse***********for nested structures?
        scope.animation.refresh();
        draggedClone.classList.toggle('lmdd-dragged');//reverse
    };
    var updateMirrorLocation = function() {
        if (mirror) {
            mirror.style.top = (mouseLocation.pageY - parseInt(mirror.parentNode.style.top) + scroll.deltaY) + 'px';
            mirror.style.left = (mouseLocation.pageX - parseInt(mirror.parentNode.style.left) + scroll.deltaX) + 'px';
        }
    };
    var setMirror = function() {
        mirror = draggedClone.cloneNode(true);
        mirror.classList.toggle('lmdd-mirror');
        mirror.classList.toggle('lmdd-dragged');
        mirror.style.opacity = 0.7;
        mirror.style.width = draggedClone.getBoundingClientRect().width + 'px';
        mirror.style.height = draggedClone.getBoundingClientRect().height + 'px';
        var scaleX = Math.min(300/draggedClone.getBoundingClientRect().width,1);
        var scaleY = Math.min(100/draggedClone.getBoundingClientRect().height,1);
        mirror.style.transform = 'scale(' + scaleY + ',' + scaleY + ')';
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
    var mouseLocationUpdated = function(event) {
        scroll.lastX = window.scrollX;
        scroll.lastY = window.scrollY;
        if(event.type==='touchmove'){
            event.preventDefault();
        }
        var location = (event.type === 'touchmove')?event.touches[0]:event;
        mouseLocation.pageY = location.pageY;
        mouseLocation.pageX = location.pageX;
        mouseLocation.clientX = location.clientX;
        mouseLocation.clientY = location.clientY;
        mouseLocation.timeStamp = event.timeStamp;
        updateMirrorLocation();
        if ((mouseLocation.container)&&(mouseLocation.container.original)&&(draggedElement)&&(speedTracker.speed<0.1)) {//
            mouseLocation.container.insertBefore(draggedElement, mouseLocation.container.childNodes[mouseLocation.position]);
            scope.animation.refresh();
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
            if (elArray[i].nodeType === 3){
                // console.log(elArray[i].parentNode);
            }
        };
    };
    var setEventHandlers = {


    };
    var unsetEventHandlers = {

    };
    var animation = function(el) {
        this.el = el;
        this.init = function() {
            this.clone = el.cloneNode(true);
            this.clone.removeAttribute('id');
            createReference(this.el,this.clone);//reverseVV
            this.refresh();
            this.clone.classList.toggle('visible-layer'); //reverseVV
            this.el.classList.toggle('hidden-layer'); //reverseVV
            scope.parentNode.append(this.clone); //reverseVV
        };
        this.refresh = function() {
            animateElement(this.el);
        };
        this.kill = function() {
            scope.parentNode.removeChild(this.clone); //reverseVV
            this.clone = {};
            this.el.classList.toggle('hidden-layer');
            deleteReference(this.el);
        };
        return this;
    };
    return {
        init: function(el,lmddOptions) {
            cleanNode(el);//get rid of whitespaces
            el.lmddOptions = Object.assign({}, options, lmddOptions);//create options object
            console.log(el.lmddOptions);
            //add container class
            var containers = el.getElementsByClassName(containerClass);
            if (el.classList.contains(containerClass)) {
                el.classList.toggle('lmdd-container') //reverse
            };
            for (var i = 0; i < containers.length; i++) {
                containers[i].classList.toggle('lmdd-container'); //reverse
            };
            var draggables = el.getElementsByClassName(draggableClass);
            for (var i = 0; i < draggables.length; i++) {
                draggables[i].classList.toggle('lmdd-draggable'); //revrese
                draggables[i].addEventListener("mousedown", function(event) {
                    dragStarted(event, el);
                }, false); //reverse
                draggables[i].animationBlock = true;
                draggables[i].addEventListener("touchstart", function(event) {
                    dragStarted(event, el);
                }, false); //reverse
            }
            //record mouse movements
            document.addEventListener("mousemove", mouseLocationUpdated); //reverse
            document.addEventListener("scroll", scrollEvent);
            window.addEventListener("mouseup", dragEnded); //reverse
            document.addEventListener("touchend", function(event) {
                console.log('touchend');
                dragEnded(event);
            }, false); //reverse
            //create animation object
            el.animation = new animation(el);
        }
    };
})();