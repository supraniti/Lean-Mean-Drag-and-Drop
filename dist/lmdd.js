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
if (typeof (NodeList.prototype.forEach) === 'undefined'){
    NodeList.prototype.forEach = Array.prototype.forEach;
}

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
        nativeScroll:false,
        clone:false
    };
    var protectedProperties = ['padding','padding-top','padding-bottom','padding-right','padding-left','display','list-style-type','line-height'];
    var calcInterval = false;
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
    var scope = {};//html element in which drag event occurs
    var draggedElement = false;//html element being dragged
    var draggedClone = false;//clone of dragged element (used to animate movement)
    var mirror = false;//clone of dragged element attached to mouse cursor while dragging
    var events = {
        last:false,
        tick:false,
    };
    var positions = {
        currentTarget:false,
        originalContainer:false,
        originalNextSibling:false,
        currentContainer:false,
        previousContainer:false,
        currentCoordinates:false,
        currentPosition:false,
        previousPosition:false
    };
    var status = {
        mouseSpeed:false,
        dragEvent:false
    };
    var updateOriginalPosition = function(){
        positions.originalContainer = draggedElement.parentNode;
        positions.originalNextSibling = draggedElement.nextSibling;
    };
    var updateCurrentContainer = function(){
        positions.previousContainer = positions.currentContainer;
        positions.currentContainer = getWrapper(events.last.target,'lmdd-container');
        if (positions.currentContainer !== positions.previousContainer){console.log('containerChanged',positions.currentContainer , positions.previousContainer)}
    };
    var updateCurrentCoordinates = function(){
        if (positions.currentContainer){
            positions.currentCoordinates = getCoordinates(positions.currentContainer);
        }
        else{
            positions.currentCoordinates = getCoordinates(positions.originalContainer);
        }
    };
    var updateCurrentPosition = function(){
        positions.previousPosition = positions.currentPosition;
        if (positions.currentContainer) {
            positions.currentPosition = getPosition(positions.currentCoordinates, events.last.clientY, events.last.clientX);
        }
        else{
            positions.currentPosition = false;
        };
    };
    var appendDraggedElement = function(){
        if (positions.currentContainer){
            positions.currentContainer.insertBefore(draggedElement, positions.currentContainer.childNodes[positions.currentPosition]);
        }
        else {
            positions.originalContainer.insertBefore(draggedElement,positions.originalNextSibling);
        }
        updateCurrentCoordinates();
        animateElement(scope);
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
                if (el !== draggedElement){
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
        var cStyle = (window.getComputedStyle)?window.getComputedStyle(draggedElement,null):draggedElement.currentStyle;
        for (var i=0;i<protectedProperties.length;i++){
            draggedClone.style[protectedProperties[i]]= cStyle[protectedProperties[i]];
        }
        draggedClone.classList.add('lmdd-dragged');//reverse
        draggedClone.classList.remove('lmdd-hidden');//reverse
        scope.cloneRef.appendChild(draggedClone);//insert the shadow into the dom
    };
    var updateMirrorLocation = function() {
        mirror.style.top = (events.last.pageY - parseInt(mirror.parentNode.style.top) + scroll.deltaY - dragOffset.y) + 'px';
        mirror.style.left = (events.last.pageX - parseInt(mirror.parentNode.style.left) + scroll.deltaX - dragOffset.x) + 'px';
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
        var draggables = el.getElementsByClassName(el.lmddOptions.draggableItemClass);
        for (var i = 0; i < draggables.length; i++) {
            draggables[i].classList.remove('lmdd-draggable'); //revrese
        };
        var containers = el.getElementsByClassName(el.lmddOptions.containerClass);
        el.classList.remove('lmdd-container') //reverse
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
        events.last = false;
        clearInterval(calcInterval);
        document.removeEventListener("mousemove", eventManager , false); //reverse
        document.removeEventListener("scroll", eventManager , false);//reverse
    };
    var eventTicker = function(){
        var revert = true;
        if (events.tick === events.last){
            return false;
        }
        events.tick = events.last;
        if (positions.currentTarget !== events.last.target){
            positions.currentTarget = events.last.target;
            updateCurrentContainer();
            if (!positions.currentContainer){//no container found
                console.log('out of scope...');
                if (positions.previousContainer && revert){//execute once (revert)
                    console.log('revert');
                    appendDraggedElement();
                    animateElement(scope);
                }
            }
            else{//found a container
                if (positions.currentContainer !== positions.previousContainer){//its a new one...
                    updateCurrentCoordinates();
                    updateCurrentPosition();
                    console.log('append on:',positions.currentContainer,positions.currentPosition);
                    appendDraggedElement();
                    animateElement(scope);
                }
                else{//same container
                    updateCurrentPosition();
                    if (positions.currentPosition !== positions.previousPosition){//new position
                        appendDraggedElement();
                        animateElement(scope);
                        console.log('append on:',positions.currentContainer,positions.currentPosition);
                    };
                }
            }
        }
        else{
            console.log('mmmm...')
            updateCurrentPosition();
            if (positions.currentPosition !== positions.previousPosition){//new position
                console.log('append on:',positions.currentContainer,positions.currentPosition);
                appendDraggedElement();
                animateElement(scope);
            };
        };
    };
    var eventManager = function(event){
        if (event.type === 'mouseup'){
            killEvent();
            return false;
        };
        if ((event.button !== 0)&&(event.type !== 'scroll')){
            killEvent();
            return false;
        };
        if (event.type === 'mousemove'){
            events.last = event;
            scroll.lastX = window.pageXOffset;
            scroll.lastY = window.pageYOffset;
            updateMirrorLocation();
        };
        if (event.type === 'scroll'){
            updateMirrorLocation();
            updateCurrentCoordinates();
        };
        if (event.type === 'mousedown'){
            scope = this;
            events.last = event;
            window.setTimeout(function(){//delay the dragstart for a short time to enable clicking and text selection
                if ((events.last)&&(window.getSelection().anchorOffset === window.getSelection().focusOffset)){
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
                        updateOriginalPosition();
                        draggedElement.classList.add('lmdd-hidden');//reverse
                        window.getSelection().removeAllRanges();//disable selection on FF and IE - JS
                        document.body.classList.add('unselectable');//disable selection on Chrome - CSS
                        dragOffset.x = event.clientX - target.getBoundingClientRect().left;
                        dragOffset.y = event.clientY - target.getBoundingClientRect().top;
                        dragStarted(event);
                        document.addEventListener("mousemove" , eventManager , false); //follow mouse movement
                        document.addEventListener("scroll" , eventManager , false);//for updating mirror location onscroll
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