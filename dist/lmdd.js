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
        dragstartTimeout:200,
        calcInterval:200,
        clone:false
    };
    var calcInterval = false;
    var origin = {
        container:{},
        nextSibling: {},
        clone:{},
        cloneAnimated:false
    };
    var scroll = {
        lastX:window.pageXOffset,
        lastY:window.pageYOffset,
        get deltaX(){
            return window.pageXOffset - this.lastX;
        },
        get deltaY(){
            return window.pageYOffset - this.lastY;
        }
    };
    var dragOffset = {
        x:0,
        y:0
    }
    var scope = {};
    var draggedElement = false;
    var draggedClone = false;
    var mirror = false;
    var currentEvent = false;//updated on every app tick
    var pendingEvent = false;//updated on every event
    var currentPosition = false;//update on every mousemove event
    var currentContainer = false;//updated on every event update
    var currentLocation = false;//updated on every event update (when mouse speed is moderate)
    var currentSpeed = false;
    var speedEvent = false;

    var mouseLocation = {
        event:{},
        lastEvent:{},
        container:false,
        pos: 0,
        updatePosition:function(){
            this.pos = getPosition(this.cords, pendingEvent.clientY, pendingEvent.clientX);
        },
        cords: {},
        updateCords: function(){
            if(currentContainer){
                this.cords = getCoordinates(currentContainer);
            }
        },
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
    var getOffset = function(el1, el2) {//todo:double check on IE
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
            if (el.classList.contains('lmdd-container')||(el === scope)){
                if (el!==draggedElement){
                    el.cloneRef.style.display='block';
                    el.cloneRef.style.padding=0;
                    el.childNodes.forEach(function (node) {
                        animateElement(node);
                    });
                }
            }
        }
    };
    var animateNode = function(elNode) {
        var cloneNode = elNode.cloneRef;
        var elRect = elNode.getBoundingClientRect();
        cloneNode.style.position = 'absolute';
        cloneNode.style.width = (elRect.width) + 'px';
        cloneNode.style.height = (elRect.height) + 'px';
        cloneNode.style.margin = 0;
        if (elNode === scope) {
            var offset = getOffset(elNode, elNode.parentNode);
            cloneNode.style.top = elRect.top + window.pageYOffset + 'px';
            cloneNode.style.left = elRect.left + window.pageXOffset + 'px';
        } else {
            var offset = (elNode === draggedElement)?getOffset(elNode, scope):getOffset(elNode, elNode.parentNode);
            cloneNode.style.transform = 'translate3d(' + offset.x + 'px, ' + offset.y + 'px,0px)';
            //todo: depends on animation option (translate3d,topleft,translate2d)
            // cloneNode.style.top =  offset.y + 'px';
            // cloneNode.style.left = offset.x + 'px';
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
        var firstRight = lastAbove + 1;
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
    var dragStarted = function(event) {
        mouseLocation.event = event;
        scroll.lastX = window.pageXOffset;
        scroll.lastY = window.pageYOffset;
        setAnimationLayer();
        setDraggedClone();
        animateElement(scope);//take care of positioning
        setMirror();//reverseVV
        toggleVisibleLayer();//show us what you've done
    };
    var setDraggedClone = function() {
        draggedClone = draggedElement.cloneRef;//use a copy of the dragged element to act as shadow/ghost
        var protectedProperties = ['padding','padding-top','padding-bottom','padding-right','padding-left','display','list-style-type','line-height'];
        var cStyle = (window.getComputedStyle)?window.getComputedStyle(draggedElement,null):draggedElement.currentStyle;
        for (var i=0;i<protectedProperties.length;i++){
            draggedClone.style[protectedProperties[i]]= cStyle[protectedProperties[i]];
        }
        draggedClone.classList.add('lmdd-dragged');//reverse
        draggedClone.classList.remove('lmdd-hidden');//reverse
        scope.cloneRef.appendChild(draggedClone);//insert the shadow into the dom
    };
    var updateMirrorLocation = function() {
        mirror.style.top = (pendingEvent.pageY - parseInt(mirror.parentNode.style.top) + scroll.deltaY - dragOffset.y) + 'px';
        mirror.style.left = (pendingEvent.pageX - parseInt(mirror.parentNode.style.left) + scroll.deltaX - dragOffset.x) + 'px';
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
        if (draggedElement){
            if(scope.cloneRef){
                scope.cloneRef.removeChild(mirror);
                mirror = false;
            }

        }
    };
    var scrollEvent = function (event){
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
        return (path.indexOf(scope) > -1) ? wrapper : false;
    };
    var mouseLocationUpdated = function(event) {
        pendingEvent = event;
        // mouseLocation.container = getWrapper(event.target,'lmdd-container');
        var revert = true;
        scroll.lastX = window.pageXOffset;
        scroll.lastY = window.pageYOffset;
        var location = (event.type === 'touchmove')?event.touches[0]:event;
        mouseLocation.event = (event.type === 'touchmove')?event.touches[0]:event;
        updateMirrorLocation();
        // if ((mouseLocation.container)&&(mouseLocation.container.original)&&(draggedElement)&&(mouseLocation.speed<0.1)) {//
        //     mouseLocation.container.insertBefore(draggedElement, mouseLocation.container.childNodes[mouseLocation.position]);
        //     animateElement(scope);
        //     mouseLocation.updateCords();
        //     console.log('oldfunc')
        // }
        // else if(!mouseLocation.container&&revert){
        //     origin.container.insertBefore(draggedElement,origin.nextSibling);
        //     animateElement(scope);
        //     console.log('oldfunc')
        // }
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
    var toggleVisibleLayer = function(){
        if (scope.cloneRef){
            scope.cloneRef.classList.toggle('visible-layer'); //reverseVV
            scope.classList.toggle('hidden-layer'); //reverseVV
        }
    };
    var muteEvent = function(event) {
        event.preventDefault();
        event.stopPropagation();
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
        if (scope.cloneRef){
            scope.parentNode.removeChild(scope.cloneRef); //reverseVV
        }
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
    var killEvent = function(){
        document.body.classList.remove('unselectable');
        if (draggedElement){
            draggedElement.classList.remove('lmdd-hidden');
            unsetMirror();
            unsetAnimationLayer();
        }
        scope = false;
        draggedElement = false;
        draggedClone = false;
        pendingEvent = false;
        clearInterval(calcInterval);
        document.removeEventListener("mousemove", mouseLocationUpdated); //reverse
        document.removeEventListener("scroll", scrollEvent);//reverse
    };
    var eventTicker = function(){
        currentSpeed = pendingEvent.timeStamp - speedEvent.timeStamp;
        speedEvent = pendingEvent;
        if (currentEvent.target !== pendingEvent.target){
            currentContainer = getWrapper(pendingEvent.target,'lmdd-container');
            mouseLocation.container = getWrapper(pendingEvent.target,'lmdd-container');
            mouseLocation.updateCords();
            currentEvent = pendingEvent;
        }
        mouseLocation.updatePosition();
        var revert = true;
        if ((currentContainer)&&(currentContainer!==draggedElement)&&(currentContainer.original)&&(draggedElement)&&(currentSpeed>0)) {//
            currentContainer.insertBefore(draggedElement, currentContainer.childNodes[mouseLocation.pos]);
            animateElement(scope);
            mouseLocation.updateCords();
        }
        else if(!mouseLocation.container&&revert&&(currentSpeed>0)){
            origin.container.insertBefore(draggedElement,origin.nextSibling);
            animateElement(scope);
        }

    };
    var eventManager = function(event){
        if ((event.type === 'mouseup')&&(event.button === 0)) {
            killEvent();
        };
        if ((event.type === 'mousedown')&&(event.button === 0)){
            scope = this;
            pendingEvent = event;
            window.setTimeout(function(){//delay the dragstart for a short time to enable clicking and text selection
                if ((pendingEvent)&&(window.getSelection().anchorOffset === window.getSelection().focusOffset)){
                    if((scope.lmddOptions.handleClass)&&(!event.target.classList.contains(scope.lmddOptions.handleClass))){//not dragging with handle
                            killEvent();
                            return false;
                    };
                    var target = getWrapper(event.target,'lmdd-draggable');
                    if (!target){//not dragging a draggable
                        killEvent();
                        return false;
                    }
                    else if(!draggedElement){
                        draggedElement = target;
                        draggedElement.classList.add('lmdd-hidden');//reverse
                        window.getSelection().removeAllRanges();//disable selection on FF and IE - JS
                        document.body.classList.add('unselectable');//disable selection on Chrome - CSS
                        origin.container = target.parentNode;
                        origin.nextSibling = target.nextSibling;
                        dragOffset.x = event.clientX - target.getBoundingClientRect().left;
                        dragOffset.y = event.clientY - target.getBoundingClientRect().top;
                        dragStarted(event);
                        document.addEventListener("mousemove", mouseLocationUpdated); //follow mouse movement
                        document.addEventListener("scroll", scrollEvent);//for updating mirror location onscroll
                        calcInterval = window.setInterval(eventTicker,scope.lmddOptions.calcInterval);//calculation interval for mouse movement
                    }
                };
            },scope.lmddOptions.dragstartTimeout);
        }
    }
    return {
        init: function(el,lmddOptions) {
            if (!el.lmdd){
                cleanNode(el);//get rid of whitespaces
                el.lmdd = true;
                el.lmddOptions = Object.assign({}, options, lmddOptions);//create options object
                console.log(el.lmddOptions);
                setDraggables(el);
                el.addEventListener('mousedown',eventManager,false);
                window.addEventListener('mouseup',eventManager,false);
                document.addEventListener("drag", muteEvent, false);
                document.addEventListener("dragstart", muteEvent, false);
            }
        },
        kill:function(el){
            if (el.lmdd){
                document.removeEventListener("drag", muteEvent, false);
                document.removeEventListener("dragstart", muteEvent, false);
                console.log('unsettingdraggables')
                unsetDraggables(el);
                el.lmdd = false;
                delete(el.lmddOptions);
            }
        }
    };
})();