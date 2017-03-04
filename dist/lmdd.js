///todo: wrappping it up,handle clone status,vuejs app (layoutbuilder)
var lmdd = (function () {
    "use strict";
    var options = {//default settings
        containerClass: false,
        fixedItemClass: false,//fixed items will be ignored while sorting
        draggableItemClass: false,
        handleClass: false,
        mirrorMinHeight: 100,
        mirrorMaxWidth: 500,
        revert: false,
        dragstartTimeout: 50,
        calcInterval: 200,
        nativeScroll: false,
        protectedProperties: ["padding", "padding-top", "padding-bottom", "padding-right", "padding-left", "display", "list-style-type", "line-height"],
        matchObject: false
    };
    var dragged = null;//the dragged element
    var shadow = null;//clone of the dragged element used as a visible placeholder
    var mirror = null;//clone of the dragged element attached to the mouse cursor
    var elementManager = {
        set: function (el) {
            createReference(scope);//create a clone reference for every element on scope
            dragged = el;
            shadow = dragged.cloneRef;
            var cStyle = (window.getComputedStyle) ? window.getComputedStyle(dragged, null) : dragged.currentStyle;
            scope.lmddOptions.protectedProperties.forEach(function (prop) {
                shadow.style[prop] = cStyle[prop];
            });
            mirror = shadow.cloneNode(true);
            toggleClass(dragged, "lmdd-hidden", true, "onDragEnd");
            shadow.classList.add("lmdd-shadow");
            mirror.classList.add("lmdd-mirror");
            updateOriginalPosition();
            updateCurrentContainer();
            updateCurrentCoordinates();
            window.getSelection().removeAllRanges();//disable text selection on FF and IE - JS
            toggleClass(document.body, "unselectable", true, "onDragEnd");//disable text selection on CHROME - CSS
            scope.parentNode.appendChild(scope.cloneRef); //insert the clone into the dom
            todo.onDragEnd.push(function () {
                scope.parentNode.removeChild(scope.cloneRef);
                deleteReference(scope);
            });
            scope.cloneRef.appendChild(shadow);//insert the shadow into the dom
            animateElement(scope);//take care of positioning
            mirror.style.width = shadow.getBoundingClientRect().width + "px";
            mirror.style.height = shadow.getBoundingClientRect().height + "px";
            var scaleX = scope.lmddOptions.mirrorMaxWidth / shadow.getBoundingClientRect().width;
            var scaleY = scope.lmddOptions.mirrorMinHeight / shadow.getBoundingClientRect().height;
            var scale = Math.min(1, Math.max(scaleX, scaleY));
            dragOffset.x *= scale;
            dragOffset.y *= scale;
            mirror.style.transform = "scale(" + scale + "," + scale + ")";
            mirror.style.transformOrigin = "0 0";
            scope.cloneRef.appendChild(mirror);
            scrollDelta.lastX = window.pageXOffset;
            scrollDelta.lastY = window.pageYOffset;
            updateMirrorLocation();
            toggleClass(scope, "hidden-layer", true, "onDragEnd");
            toggleClass(scope.cloneRef, "visible-layer", true, false);
        },
        unset: function () {
            dragged = null;
            mirror = null;
            shadow = null;
        }
    };
    var status = "waitDragStart"; // dragStart, , waitDragEnd, dragEnd
    var calcInterval = null;
    var scrollDelta = {
        lastX: window.pageXOffset,
        lastY: window.pageYOffset,
        get x() {
            return window.pageXOffset - scrollDelta.lastX;
        },
        get y() {
            return window.pageYOffset - scrollDelta.lastY;
        }
    };
    var dragOffset = {
        x: 0,
        y: 0
    };
    var scope = null;//html element in which drag event occurs
    var lastEvent = null;
    var refEvent = null;
    var positions = {
        currentTarget: false,
        originalContainer: false,
        originalNextSibling: false,
        currentContainer: false,
        previousContainer: false,
        currentCoordinates: false,
        currentPosition: false,
        previousPosition: false
    };
    var todo = {
        executeTask: function (batch) {
            todo[batch].forEach(function (fn) {
                fn();
            });
            todo[batch] = [];
        },
        onDragEnd: [],
        onNextAppend: [],
        onTransitionEnd: []
    };
    var scrollManager = {
        event: null,
        active:true,
        refTarget: false,
        sm: 20,//scroll margin
        el: document.documentElement,//scroll scope
        nested: false,//true when scrolling an element, false when scrolling the window
        scrollInvoked:{
            top:false,
            left:false,
            bottom:false,
            right:false
        },
        getScrollContainer : function (el) {
            if (document.body.contains(el)) {
                return ((el.scrollWidth > el.clientWidth && el.clientWidth > 0) || (el.scrollHeight > el.clientHeight && el.clientHeight > 0)) ? el : this.getScrollContainer(el.parentNode);
            }
            return document.documentElement;
        },
        targetUpdated: function () {
            this.refTarget = this.event.target;
            this.el = this.getScrollContainer(this.event.target);
            this.nested = (this.el !== document.documentElement);
        },
        get canScroll(){
            var mspx = this.el.scrollWidth - this.el.clientWidth, mspy = this.el.scrollHeight - this.el.clientHeight;//maximum scroll point on each axis
            return {
                top: (this.nested) ? (this.el.scrollTop > 0) : (window.pageYOffset > 0),
                left: (this.nested) ? (this.el.scrollLeft > 0) : (window.pageXOffset > 0),
                bottom: (this.nested) ? (this.el.scrollTop < mspy) : (window.pageYOffset < mspy),
                right: (this.nested) ? (this.el.scrollLeft < mspx) : (window.pageXOffset < mspx)
            }
        },
        get cmp(){//current mouse position relative to container
            return{
                x: (this.nested) ? this.event.clientX - this.el.getBoundingClientRect().left : this.event.clientX,
                y: (this.nested) ? this.event.clientY - this.el.getBoundingClientRect().top : this.event.clientY
            }
        },
        get willScroll(){
            return{
                top: (this.cmp.y <= this.sm)&&(this.canScroll.top),
                left: (this.cmp.x <= this.sm)&&(this.canScroll.left),
                bottom: (this.cmp.y >= this.el.clientHeight - this.sm)&&(this.canScroll.bottom),
                right: (this.cmp.x >= this.el.clientWidth - this.sm)&&(this.canScroll.right)
            }
        },
        get speed(){
            return this.sm + (Math.max(0 - this.cmp.y,0 - this.cmp.x,this.cmp.y - this.el.clientHeight ,this.cmp.x - this.el.clientWidth));
        },
        updateEvent: function (e) {
            this.event = e;
            if (e.target !== this.refTarget) {
                this.targetUpdated();
            }
            for (var key in this.willScroll){
                if ((this.willScroll[key])&&(!this.scrollInvoked[key])){
                    this.move(key);
                }
            }
        },
        move:function(key){
            var self = this;
            this.scrollInvoked[key] = window.setInterval(function(){
                if (self.nested) {
                    switch (key) {
                        case "top":
                            self.el.scrollTop -= self.speed;
                            break;
                        case "left":
                            self.el.scrollLeft -= self.speed;
                            break;
                        case "bottom":
                            self.el.scrollTop += self.speed;
                            break;
                        case"right":
                            self.el.scrollLeft += self.speed;
                            break;
                    }
                }
                else {
                    switch (key) {
                        case "top":
                            window.scrollTo(window.pageXOffset, window.pageYOffset - self.speed);
                            break;
                        case "left":
                            window.scrollTo(window.pageXOffset - self.speed, window.pageYOffset);
                            break;
                        case "bottom":
                            window.scrollTo(window.pageXOffset, window.pageYOffset + self.speed);
                            break;
                        case"right":
                            window.scrollTo(window.pageXOffset + self.speed, window.pageYOffset);
                            break;
                    }
                }
                if ((!self.willScroll[key])||(!self.active)){
                    clearInterval(self.scrollInvoked[key]);
                    self.scrollInvoked[key]=false;
                }
            },16);
        }
    };
    function assignOptions(defaults, settings) {
        var target = {};
        Object.keys(defaults).forEach(function (key) {
            target[key] = (Object.prototype.hasOwnProperty.call(settings, key) ? settings[key] : defaults[key]);
        });
        return target;
    }
    function simulateMouseEvent(event) {//convert touch to mouse events
        if (event.touches.length > 1) {
            return;
        }
        var simulatedType = (event.type === "touchstart") ? "mousedown" : (event.type === "touchend") ? "mouseup" : "mousemove";
        var simulatedEvent = new MouseEvent(simulatedType, {
            "view": window,
            "bubbles": true,
            "cancelable": true,
            "screenX": (event.touches[0]) ? event.touches[0].screenX : 0,
            "screenY": (event.touches[0]) ? event.touches[0].screenY : 0,
            "clientX": (event.touches[0]) ? event.touches[0].clientX : 0,
            "clientY": (event.touches[0]) ? event.touches[0].clientY : 0,
            "button": 0,
            "buttons": 1
        });
        var eventTarget = (event.type === "touchmove") ? document.elementFromPoint(simulatedEvent.clientX, simulatedEvent.clientY) || document.body : event.target;
        if (status === "dragStart") {
            event.preventDefault();
        }
        eventTarget.dispatchEvent(simulatedEvent);
    }
    function updateOriginalPosition() {
        positions.originalContainer = dragged.parentNode;
        positions.originalNextSibling = dragged.nextSibling;
    }
    function updateCurrentContainer() {
        positions.previousContainer = positions.currentContainer;
        if (positions.currentTarget !== lastEvent.target) {
            positions.currentTarget = lastEvent.target;
            positions.currentContainer = getWrapper(lastEvent.target, scope.lmddOptions.containerClass);
        }
    }
    function updateCurrentCoordinates() {
        if (positions.currentContainer) {
            positions.currentCoordinates = getCoordinates(positions.currentContainer);
        }
        else {
            positions.currentCoordinates = getCoordinates(positions.originalContainer);
        }
    }
    function updateCurrentPosition() {
        positions.previousPosition = positions.currentPosition;
        if (positions.currentContainer) {
            positions.currentPosition = getPosition(positions.currentCoordinates, lastEvent.clientY, lastEvent.clientX);
        }
        else {
            positions.currentPosition = false;
        }
    }
    function appendDraggedElement() {
        if ((positions.currentContainer) && (acceptDrop(positions.currentContainer, dragged))) {
            positions.currentContainer.insertBefore(dragged, positions.currentContainer.childNodes[positions.currentPosition]);
            todo.executeTask("onNextAppend");
        }
        else {
            if (scope.lmddOptions.revert) {
                positions.originalContainer.insertBefore(dragged, positions.originalNextSibling);
            }
        }
        updateCurrentCoordinates();
        animateElement(scope);
    }
    function acceptDrop(container, item) {
        if (item.contains(container)) {
            return false;
        }
        if (container.classList.contains("lmdd-dispatcher")) {
            return false;
        }
        if (scope.lmddOptions.matchObject) {
            var cType = container.dataset.containerType || false;
            var iType = item.dataset.itemType || false;
            return ((cType) ? ((iType) ? scope.lmddOptions.matchObject [cType][iType] : scope.lmddOptions.matchObject[cType]["default"]) : scope.lmddOptions.matchObject["default"]);
        }
        return true;
    }
    function toggleClass(el, className, action, undo) {
        (action) ? el.classList.add(className) : el.classList.remove(className);
        if (undo) {
            todo[undo].push(function () {
                (action) ? el.classList.remove(className) : el.classList.add(className)
            });
        }
    }
    function toggleEvent(el, listener, fn, useCapture, undo) {
        el.addEventListener(listener, fn, useCapture);
        todo[undo].push(function () {
            el.removeEventListener(listener, fn, useCapture);
        });
    }
    function cleanNode(el) {//clean empty nodes
        Array.prototype.forEach.call(el.childNodes, function (node) {
            if (node.nodeType === 8 || (node.nodeType === 3 && !(/\S/).test(node.nodeValue))) {
                el.removeChild(node);
            }
            else if (node.nodeType === 1) {
                cleanNode(node);
            }
        });
    }
    function getOffset(el1, el2) {
        var rect1 = el1.getBoundingClientRect(),
            rect2 = el2.getBoundingClientRect();
        var borderWidth = {
            left: parseInt(window.getComputedStyle(el2, null).getPropertyValue("border-left-width"), 10),
            top: parseInt(window.getComputedStyle(el2, null).getPropertyValue("border-top-width"), 10)
        };
        return {
            x: rect1.left - rect2.left - borderWidth.left,
            y: rect1.top - rect2.top - borderWidth.top
        };
    }
    function getWrapper(el, wrapperClass) {
        var path = [];
        var wrapper = false;
        for (; el && el !== document; el = el.parentNode) {
            path.unshift(el);
            if ((el.classList.contains(wrapperClass)) && (!wrapper)) {
                wrapper = el;
            }
        }
        return (path.indexOf(scope) > -1) ? wrapper : false;
    }
    function deleteReference(el) {
        delete(el.cloneRef);
        Array.prototype.forEach.call(el.childNodes, function (node) {
            deleteReference(node);
        });
    }
    function animateElement(el) {
        if (el.nodeType === 1) {
            animateNode(el);
            if (el.classList.contains(scope.lmddOptions.containerClass) || (el === scope)) {
                if (el !== dragged) {
                    el.cloneRef.style.display = "block";
                    el.cloneRef.style.padding = 0;
                    Array.prototype.forEach.call(el.childNodes, function (node) {
                        animateElement(node);
                    });
                }
            }
        }
    }
    function animateNode(elNode) {
        var cloneNode = elNode.cloneRef;
        var elRect = elNode.getBoundingClientRect();
        var offset;
        cloneNode.style.position = "absolute";
        cloneNode.style.width = (elRect.width) + "px";
        cloneNode.style.height = (elRect.height) + "px";
        cloneNode.style.margin = 0;
        if (elNode === scope) {
            cloneNode.style.top = elRect.top + window.pageYOffset + "px";
            cloneNode.style.left = elRect.left + window.pageXOffset + "px";
        } else {
            offset = (elNode === dragged) ? getOffset(elNode, scope) : getOffset(elNode, elNode.parentNode);
            cloneNode.style.transform = "translate3d(" + offset.x + "px, " + offset.y + "px,0px)";
        }
    }
    function getCoordinates(el) {
        var coordinates = [];
        Array.prototype.forEach.call(el.childNodes, function (node, index) {
            if (node.nodeType === 1) {
                var coordinate = node.getBoundingClientRect();
                coordinate.index = index;
                if (!node.classList.contains("fixed")) {
                    coordinates.push(coordinate);
                }
            }
        });
        return coordinates;
    }
    function getPosition(coordinates, top, left) {
        var length = coordinates.length;
        if (length === 0) {
            return null
        }
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
        }
        for (; firstBelow <= length; firstBelow++) {
            if (firstBelow === length) {
                break;
            } else if (coordinates[firstBelow].top > top) {
                break;
            }
        }
        var firstRight = lastAbove + 1;
        for (; firstRight <= firstBelow; firstRight++) {
            if (firstRight === firstBelow) {
                position = firstRight;
                break;
            } else if (coordinates[firstRight].left > left) {
                position = firstRight;
                break;
            }
        }
        if (position === length) {
            return coordinates[position - 1].index + 1;
        }
        return coordinates[position].index;
    }
    function updateMirrorLocation() {
        if (mirror) {
            mirror.style.top = (lastEvent.pageY - parseInt(mirror.parentNode.style.top, 10) + scrollDelta.y - dragOffset.y) + "px";
            mirror.style.left = (lastEvent.pageX - parseInt(mirror.parentNode.style.left, 10) + scrollDelta.x - dragOffset.x) + "px";
        }
    }
    function createReference(el) {
        var clone = el.cloneNode(true);
        clone.id += "-lmddClone";
        var elArray = [];
        var cloneArray = [];
        var traverse = function (el, refArray) {
            refArray.push(el);
            Array.prototype.forEach.call(el.childNodes, function (node) {
                traverse(node, refArray);
            });
        };
        traverse(el, elArray);
        traverse(clone, cloneArray);
        for (var i = 0; i < elArray.length; i++) {
            elArray[i].cloneRef = cloneArray[i];
        }
    }
    function muteEvent(event) {
        event.preventDefault();
        event.stopPropagation();
        return false;
    }
    function killEvent() {
        clearInterval(calcInterval);
        scrollManager.active = false;
        calcInterval = null;
        if (scope.check) {
            toggleClass(scope.cloned, "no-display", false, false);
            if (scope.check.parentNode) {
                scope.check.parentNode.removeChild(scope.check);
            }
            ;
        }
        todo.executeTask("onDragEnd");
        if (status !== "dragStartTimeout") {
            var event = new CustomEvent("lmddend", {
                "detail": {
                    "draggedElement": dragged,
                    "originalContainer": positions.originalContainer,
                    "originalNextSibling": positions.originalNextSibling,
                    "currentContainer": dragged.parentNode,
                    "currentNextSibling": dragged.nextSibling
                }
            });
            scope.dispatchEvent(event);
        }
        scope = false;
        lastEvent = false;
        status = "waitDragStart";
    }
    function eventTicker() {
        if (scope) {
            if (!scope.lmddOptions.nativeScroll) {
                scrollManager.updateEvent(lastEvent);
            }
            if (refEvent === lastEvent) {
                return false;
            }
            refEvent = lastEvent;
            updateCurrentContainer();
            if (!positions.currentContainer) {//no container found
                if (positions.previousContainer && scope.lmddOptions.revert) {//execute once (revert)
                    appendDraggedElement();
                }
            }
            else {//found a container
                if (positions.currentContainer !== positions.previousContainer) {//its a new one...
                    updateCurrentCoordinates();
                    updateCurrentPosition();
                    appendDraggedElement();
                }
                else {//same container
                    updateCurrentPosition();
                    if (positions.currentPosition !== positions.previousPosition) {//new position
                        appendDraggedElement();
                    }
                }
            }
        }
    }
    function eventManager(event) {
        switch (status) {
            case "waitDragStart":
                if ((event.type === "mousedown") && (event.button === 0)) {//trigger timeout function to enable clicking and text selection
                    scope = this;
                    lastEvent = event;
                    toggleEvent(window, "mouseup", eventManager, false, "onDragEnd");
                    toggleEvent(document, "mousemove", eventManager, false, "onDragEnd");
                    toggleEvent(document, "scroll", eventManager, false, "onDragEnd");
                    status = "dragStartTimeout";
                    window.setTimeout(function () {
                        if (status === "dragStartTimeout") {//no events fired during the timeout
                            if ((scope.lmddOptions.handleClass) && (!event.target.classList.contains(scope.lmddOptions.handleClass))) {//not dragging with handle
                                killEvent();
                                return;
                            }
                            else {
                                var target = getWrapper(event.target, scope.lmddOptions.draggableItemClass);
                                if (!target) {//not dragging a draggable
                                    killEvent();
                                    return;
                                }
                                else {
                                    if (target.classList.contains("lmdd-clonner")) {//clone the target
                                        scope.cloned = target.parentNode.insertBefore(target.cloneNode(true), target);
                                        scope.check = target;
                                        target.classList.remove("lmdd-clonner");
                                        toggleClass(scope.cloned, "no-display", true, "onNextAppend");
                                        todo.onNextAppend.push(function () {
                                            toggleClass(scope.cloned.cloneRef, "no-display", false, false);
                                            toggleClass(scope.cloned.cloneRef, "no-transition", true, "onDragEnd");
                                            updateOriginalPosition();
                                            scope.check = false;
                                        });
                                    }
                                    dragOffset.x = event.clientX - target.getBoundingClientRect().left;
                                    dragOffset.y = event.clientY - target.getBoundingClientRect().top;
                                    elementManager.set(target);
                                    shadow.addEventListener("transitionend", eventManager, false);
                                    if (document.body.setCapture) {
                                        document.body.setCapture(false);
                                        todo.onDragEnd.push(function () {
                                            document.releaseCapture();
                                        });
                                    }
                                    clearInterval(calcInterval);//make sure interval was not set already
                                    calcInterval = window.setInterval(eventTicker, scope.lmddOptions.calcInterval);//calculation interval for mouse movement
                                }
                            }
                            status = "dragStart";
                            scrollManager.active = true;
                        }
                    }, scope.lmddOptions.dragstartTimeout);
                }
                break;
            case "dragStartTimeout":
                killEvent();
                break;
            case "dragStart":
                if ((event.type === "mousedown") || (event.type === "mouseup") || (event.type === "mousemove") && (event.buttons === 0)) {//or mousemove with no buttons in case mouseup event was not fired
                    mirror.classList.add("gf-transition");
                    if (!dragged) {
                        killEvent();
                        return;
                    }
                    var offset = getOffset(dragged, scope);
                    mirror.style.transform = "scale(1,1)";
                    mirror.style.top = offset.y + "px";
                    mirror.style.left = offset.x + "px";
                    mirror.style.width = dragged.getBoundingClientRect().width + "px";
                    mirror.style.height = dragged.getBoundingClientRect().height + "px";
                    offset = getOffset(dragged, shadow);
                    if (Math.abs(offset.x) + Math.abs(offset.y) > 0) {//wait for transition to finish
                        status = "waitDragEnd";
                        todo.onTransitionEnd.push(function () {
                            killEvent();
                        });
                        window.setTimeout(function () {
                            if (status !== "waitDragStart") {
                                killEvent()
                            }
                            // killEvent();
                        }, 1000);
                        return;
                    }
                    else {
                        killEvent();
                        return;
                    }
                }
                if (event.type === "mousemove") {
                    lastEvent = event;
                    if (!scope.lmddOptions.nativeScroll) {//disable native scrolling on mouse down
                        event.preventDefault();
                    }
                    scrollDelta.lastX = window.pageXOffset;
                    scrollDelta.lastY = window.pageYOffset;
                    updateMirrorLocation();
                }
                if (event.type === "scroll") {
                    updateMirrorLocation();
                    updateCurrentCoordinates();
                }
                break;
            case"waitDragEnd":
                if (event.type === "transitionend") {
                    if (event.propertyName === "transform") {
                        todo.executeTask("onTransitionEnd");
                    }
                }
                break;
        }
    }
    return {
        set: function (el, lmddOptions) {
            if (!el.lmdd) {
                cleanNode(el);//get rid of whitespaces
                el.lmdd = true;
                el.lmddOptions = assignOptions(options, lmddOptions);//create options object
                el.addEventListener("mousedown", eventManager, false);
                document.addEventListener("drag", muteEvent, false);
                document.addEventListener("dragstart", muteEvent, false);
                window.addEventListener("touchstart", simulateMouseEvent);
                window.addEventListener("touchmove", simulateMouseEvent, {passive: false});
                window.addEventListener("touchend", simulateMouseEvent);
            }
        },
        unset: function (el) {
            if (el.lmdd) {
                el.removeEventListener("mousedown", eventManager, false);
                el.lmdd = false;
                delete(el.lmddOptions);
            }
        },
        kill: function () {
            document.removeEventListener("drag", muteEvent, false);
            document.removeEventListener("dragstart", muteEvent, false);
        }
    };
})();