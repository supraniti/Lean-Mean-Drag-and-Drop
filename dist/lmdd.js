
//object assign polyfill
if (typeof Object.assign != 'function') {
    Object.assign = function(target) {
        'use strict';
        if (target == null) {
            throw new TypeError('Cannot convert undefined or null to object');
        }

        target = Object(target);
        for (var index = 1; index < arguments.length; index++) {
            var source = arguments[index];
            if (source != null) {
                for (var key in source) {
                    if (Object.prototype.hasOwnProperty.call(source, key)) {
                        target[key] = source[key];
                    }
                }
            }
        }
        return target;
    };
}
//nodelist foreach hack
NodeList.prototype.forEach = Array.prototype.forEach;
///todo: touch support, wrappping it up, event triggering, vuejs app (layoutbuilder),embed options
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
        clone:{},
        cloneAnimated:false
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
    function getRect(el) {
        var xPos = 0;
        var yPos = 0;

        while (el) {
            if (el.tagName == "BODY") {
                // deal with browser quirks with body/window/document and page scroll
                var xScroll = el.scrollLeft || document.documentElement.scrollLeft;
                var yScroll = el.scrollTop || document.documentElement.scrollTop;

                xPos += (el.offsetLeft - xScroll + el.clientLeft);
                yPos += (el.offsetTop - yScroll + el.clientTop);
            } else {
                // for all other non-BODY elements
                xPos += (el.offsetLeft - el.scrollLeft + el.clientLeft);
                yPos += (el.offsetTop - el.scrollTop + el.clientTop);
            }

            el = el.offsetParent;
        }
        return {
            left: xPos,
            top: yPos
        };
    }

    var getOffset = function(el1, el2) {
        // var rect1 = getRect(el1);
        // var rect2 = getRect(el2);
        var rect1 = el1.getBoundingClientRect(),
            rect2 = el2.getBoundingClientRect();
        var borderWidth = {
            left: parseInt(window.getComputedStyle(el2,null).getPropertyValue('border-left-width')),
            top: parseInt(window.getComputedStyle(el2,null).getPropertyValue('border-top-width'))
        };
        var offset = {
            x: rect1.left - rect2.left - borderWidth.left,
            y: rect1.top - rect2.top - borderWidth.top
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
            if (el.classList.contains('lmdd-container')||(el===scope)){
                el.childNodes.forEach(function (node) {
                    animateElement(node);
                });
            }
            //
            //
            // if (!el.classList.contains('animation-block')) {
            //     el.childNodes.forEach(function (node) {
            //         animateElement(node);
            //     });
            // }
        }
    };
    //animation block: 1. i am not a container... 2. i don't contain nested containers.
    var getComputedProperty=function(el,property){
        return parseInt(window.getComputedStyle(el,null).getPropertyValue(property));
    }
    var animateNode = function(elNode) {
        var cloneNode = elNode.cloneRef;
        var elRect = elNode.getBoundingClientRect();
        cloneNode.style.position = 'absolute';
        cloneNode.style.width = (elRect.width) + 'px';
        cloneNode.style.height = (elRect.height) + 'px';
        cloneNode.style.margin = 0;
        // cloneNode.style.backfaceVisibility= 'hidden';
        // if (!elNode.classList.contains('animation-block')) {//dragged also
        if (elNode.classList.contains('lmdd-container')||(elNode===scope)) {//dragged also
            cloneNode.style.padding = 0;
            cloneNode.style.display = 'block';
        }
        if (elNode === scope) {
            var offset = getOffset(elNode, elNode.parentNode);
            // cloneNode.style.top =  offset.y + window.scrollY + 'px';
            // cloneNode.style.left = offset.x + window.scrollX + 'px';
            cloneNode.style.top = elRect.top + window.scrollY + 'px';
            cloneNode.style.left = elRect.left + window.scrollX + 'px';
        } else {
            var offset = (elNode === draggedElement)?getOffset(elNode, scope):getOffset(elNode, elNode.parentNode);
            // cloneNode.style.transform = 'translate3d(' + offset.x + 'px, ' + offset.y + 'px,0px)';
            //todo: depends on animation option (translate3d,topleft,translate2d)
            cloneNode.style.top =  offset.y + 'px';
            cloneNode.style.left = offset.x + 'px';
            // cloneNode.style.transformOrigin = '50% 50%';
        };
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
            draggedElement.classList.remove('animation-block');//reverse
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
            event.preventDefault()
            scope = this;
            mouseLocation.event = event;
            scroll.lastX = window.scrollX;
            scroll.lastY = window.scrollY;
            var clone = false;
            if(this.lmddOptions.handleClass){
                if (!event.target.classList.contains('handle')){
                    return false;
                }
            }
            var target = getWrapper(event.target,'lmdd-draggable');
            if (target){
                origin.container = target.parentNode;
                origin.nextSibling = target.nextSibling;
                dragOffset.x = event.clientX - target.getBoundingClientRect().left;
                dragOffset.y = event.clientY - target.getBoundingClientRect().top;
                document.body.classList.toggle('unselectable');///reverse
                draggedElement = target;//reverse
                if (clone){
                    draggedElement = target.cloneNode(true);
                    origin.clone = target;
                    target.parentNode.appendChild(draggedElement)
                };
                setAnimationLayer();
                setDraggedClone();
                animateElement(scope);//take care of positioning
                setMirror();//reverseVV
                draggedClone.style.transition = '1s';//parameter
                toggleVisibleLayer();//show us what you've done
                document.addEventListener("mousemove", mouseLocationUpdated); //reverse
                document.addEventListener("scroll", scrollEvent);//reverse
                window.addEventListener("mouseup", dragEnded); //reverse
            };
        };
    };
    var setDraggedClone = function(el) {
        draggedClone = draggedElement.cloneRef;//make a copy of the dragged element to act as shadow/ghost
        draggedClone.style.cssText = window.getComputedStyle(draggedElement,null).cssText;//make sure it look exactly the same...
        delete(draggedClone.style.zIndex);
        delete(draggedClone.style.opacity);
        delete(draggedClone.style.margin);
        delete(draggedClone.style.filter);
        // draggedClone.style.transition = '0s';//parameter
        draggedClone.classList.add('lmdd-dragged');//reverse
        draggedElement.classList.add('lmdd-hidden');//reverse
        scope.cloneRef.appendChild(draggedClone);//insert the shadow into the dom
    };
    var updateMirrorLocation = function() {
        if (mirror) {
            mirror.style.top = (mouseLocation.event.pageY - parseInt(mirror.parentNode.style.top) + scroll.deltaY - dragOffset.y) + 'px';
            mirror.style.left = (mouseLocation.event.pageX - parseInt(mirror.parentNode.style.left) + scroll.deltaX - dragOffset.x) + 'px';
        }
    };
    var setMirror = function() {
        mirror = draggedClone.cloneNode(true);
        mirror.classList.add('lmdd-mirror');
        mirror.classList.remove('lmdd-dragged');
        mirror.style.width = draggedClone.getBoundingClientRect().width + 'px';
        mirror.style.height = draggedClone.getBoundingClientRect().height + 'px';
        var minHeight = 100;
        var maxWidth = 500;
        var scaleX = maxWidth/draggedClone.getBoundingClientRect().width;
        var scaleY = minHeight/draggedClone.getBoundingClientRect().height;
        var scale = Math.min(1,Math.max(scaleX,scaleY));
        dragOffset.x*=scale;
        dragOffset.y*=scale;
        mirror.style.transform = 'scale(' + scale + ',' + scale + ')';
        mirror.style.transformOrigin = '0 0';
        scope.cloneRef.appendChild(mirror);
        updateMirrorLocation();
    };
    var unsetMirror = function() {
        scope.cloneRef.removeChild(mirror);
        mirror = false;
    };
    var scrollEvent = function (event){
        console.log(event)
        updateMirrorLocation();
    };
    var getWrapper = function(el, wrapperClass){
        var path = [];
        var wrapper = false;
        for ( ; el && el !== document; el = el.parentNode ) {
            path.unshift(el);
            if ((el.classList.contains(wrapperClass))&&(!wrapper)){
                wrapper = el;
            }
        };
        return (path.indexOf(scope)>-1)?wrapper:false;
    };
    var mouseLocationUpdated = function(event) {
        mouseLocation.container = getWrapper(event.target,'lmdd-container');
        var revert = true;
        scroll.lastX = window.scrollX;
        scroll.lastY = window.scrollY;
        var location = (event.type === 'touchmove')?event.touches[0]:event;
        mouseLocation.event = (event.type === 'touchmove')?event.touches[0]:event;
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
    var toggleVisibleLayer = function(){
        scope.cloneRef.classList.toggle('visible-layer'); //reverseVV
        scope.classList.toggle('hidden-layer'); //reverseVV
    };
    var setStyle = function(el,styleObject){

    };
    var muteEvent = function(event) {
        event.preventDefault();
        return false;
    };
    var setAnimationLayer = function(){
        var clone = scope.cloneNode(true);
        clone.id += '-lmddClone';
        createReference(scope,clone);//create a clone reference for every element on scope
        scope.parentNode.appendChild(scope.cloneRef); //insert the clone into the dom
    };
    var unsetAnimationLayer = function() {
        toggleVisibleLayer();
        scope.parentNode.removeChild(scope.cloneRef); //reverseVV
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
                // document.addEventListener("scroll", scrollEvent);//reverse
                // document.addEventListener("drag", muteEvent, false); //reverse
                // document.addEventListener("dragstart", muteEvent, false); //reverse
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
document.addEventListener("drag", function( event ) {
event.preventDefault();
event.stopPropagation();
return false;
}, false);

document.addEventListener("dragstart", function( event ) {
    event.preventDefault();
    event.stopPropagation();
    return false;
}, false);