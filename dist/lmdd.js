var lmdd = (function () {
    "use strict";
    var options = {//default settings
        containerClass: 'lmdd-container',
        draggableItemClass: 'lmdd-draggable',
        handleClass: false,
        dragstartTimeout: 50,
        calcInterval: 200,
        revert: true,
        nativeScroll: false,
        mirrorMinHeight: 100,
        mirrorMaxWidth: 500,
        matchObject: false,
        positionDelay: false,
        dataMode: false
    };
    var scope = null;//html element in which the current drag event occurs
    var dragged = null;//the dragged element
    var shadow = null;//clone of the dragged element used as a visible placeholder
    var mirror = null;//clone of the dragged element attached to the mouse cursor
    var clone = null;//on clone operations - clone of the original dragged element
    var cloning = false;//flag set to true on clone opertaions
    var positioned = false;//flag set to true once the target is positioned for the first time
    var status = "waitDragStart"; // dragStart, , waitDragEnd, dragEnd
    var lastEvent = null;//current event being handled
    var refEvent = null;//reference to previouse event
    var calcInterval = null;//pointer for interval function
    var scrollDelta = {//used to update mirror position while scrolling
        lastX: window.pageXOffset,
        lastY: window.pageYOffset,
        get x() {
            return window.pageXOffset - scrollDelta.lastX;
        },
        get y() {
            return window.pageYOffset - scrollDelta.lastY;
        }
    };
    var dragOffset = {//holds mouse pointer offset from dragged element top-left point while dragging
        x: 0,
        y: 0
    };
    var positions = {//html element references to element position
        currentTarget: false,
        originalContainer: false,
        originalNextSibling: false,
        originalIndex: false,
        currentContainer: false,
        currentIndex: false,
        previousContainer: false,
        currentCoordinates: false,
        currentPosition: false,
        previousPosition: false,
        referenceContainer:false
    };
    var mousemoveCounter = 0;//used to handle a bug in chrome when mousemove event is fired when mouse has not moved
    var observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.addedNodes.length > 0){
                createRectRefs(scope);
                animate(scope);
            }
        });
    });
    //tasks manager (makes sure we don't forget to undo whatever we do)
    var tasks = {
        executeTask: function (batch) {
            tasks[batch].forEach(function (fn) {
                fn();
            });
            tasks[batch] = [];
        },
        onDragEnd: [],
        onTransitionEnd: []
    };
    function toggleClass(el, className, action, undo) {
        (action) ? el.classList.add(className) : el.classList.remove(className);
        if (undo) {
            tasks[undo].push(function () {
                if (action) {
                    el.classList.remove(className);
                }
                else {
                    el.classList.add(className);
                }
            });
        }
    }
    function toggleEvent(el, listener, fn, useCapture, undo) {
        el.addEventListener(listener, fn, useCapture);
        tasks[undo].push(function () {
            el.removeEventListener(listener, fn, useCapture);
        });
    }
    //scroll controller for replacing the native scroll behaviour
    var scrollManager = {
        event: null,
        active: true,
        sm: 20,//scroll margin
        el: document.documentElement,//scroll scope
        scrollInvoked: {
            top: false,
            left: false,
            bottom: false,
            right: false
        },
        get willScroll() {
            return {
                top: (this.event.clientY <= this.sm) && (window.pageYOffset > 0),
                left: (this.event.clientX <= this.sm) && (window.pageXOffset > 0),
                bottom: (this.event.clientY >= this.el.clientHeight - this.sm) && (window.pageYOffset < this.el.scrollHeight - this.el.clientHeight),
                right: (this.event.clientX >= this.el.clientWidth - this.sm) && (window.pageXOffset < this.el.scrollWidth - this.el.clientWidth)
            };
        },
        get speed() {
            return Math.max(0, this.sm + (Math.max(0 - this.event.clientY, 0 - this.event.clientX, this.event.clientY - this.el.clientHeight, this.event.clientX - this.el.clientWidth)));
        },
        updateEvent: function (e) {
            this.event = e;
            for (var key in this.willScroll) {
                if ((this.willScroll[key]) && (!this.scrollInvoked[key])) {
                    this.move(key);
                }
            }
        },
        move: function (key) {
            var self = this;
            this.scrollInvoked[key] = window.setInterval(function () {
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
                if ((!self.willScroll[key]) || (!self.active)) {
                    clearInterval(self.scrollInvoked[key]);
                    self.scrollInvoked[key] = false;
                }
            }, 16);
        }
    };
    //helper functions
    function assignOptions(defaults, settings) {
        var target = {};
        Object.keys(defaults).forEach(function (key) {
            target[key] = (Object.prototype.hasOwnProperty.call(settings, key) ? settings[key] : defaults[key]);
        });
        return target;
    }
    function clean(node) {
        for (var n = 0; n < node.childNodes.length; n++) {
            var child = node.childNodes[n];
            if
            (
                child.nodeType === 8
                ||
                (child.nodeType === 3 && !/\S/.test(child.nodeValue))
            ) {
                node.removeChild(child);
                n--;
            }
            else if (child.nodeType === 1) {
                clean(child);
            }
        }
    }
    function getOffset(el1, el2) {//get horizontal and vertical offset between two elements
        var rect1 = el1.cloneRef.rectRef,
            rect2 = el2.cloneRef.rectRef;
        var borderWidth = {
            left: el2.cloneRef.styleRef.left.border,
            top: el2.cloneRef.styleRef.top.border
        };
        return {
            x: rect1.left - rect2.left - borderWidth.left,
            y: rect1.top - rect2.top - borderWidth.top
        };
    }
    function getWrapper(el, wrapperClass) {//get wrapper element by class name
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
    function createLmddEvent(type) {//custom app event
        return new CustomEvent(type, {
            "bubbles": true,
            "detail": {
                "dragType": (cloning) ? "clone" : "move",
                "draggedElement": (cloning) ? clone.elref : dragged,
                "from": {"container": positions.originalContainer,"index": positions.originalIndex},
                "to": (positioned) ? {"container": positions.currentContainer,"index": positions.currentIndex} : false
            }
        });
    }
    function muteEvent(event) {//mute unwanted events
        event.preventDefault();
        event.stopPropagation();
        return false;
    }
    //helper functions for handling mouse movement and element positioning
    function getCoordinates(el) {
        var coordinates = [];
        Array.prototype.forEach.call(el.childNodes, function (node, index) {
            if (node.nodeType === 1) {
                var coordinate = node.getBoundingClientRect();
                coordinate.index = index;
                if (node.classList.contains(scope.lmddOptions.draggableItemClass)) {
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
    function updateOriginalPosition(el) {
        positions.originalContainer = el.parentNode;
        positions.originalNextSibling = el.nextSibling;
        positions.originalIndex = Array.prototype.indexOf.call(el.parentNode.childNodes, el)
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
            positions.currentIndex = Array.prototype.indexOf.call(dragged.parentNode.childNodes, dragged);
            if (cloning && !positioned) {
                clone.elref.classList.remove("no-display");
                clone.elref.cloneRef.classList.remove("no-display");
                clone.elref.cloneRef.classList.add("no-transition");
                updateOriginalPosition(dragged);
            }
            positioned = true;
        }
        else if (scope.lmddOptions.revert) {
            positions.originalContainer.insertBefore(dragged, positions.originalNextSibling);
            positions.currentIndex = positions.originalIndex;
        }
        updateCurrentCoordinates();
        refEvent = lastEvent;
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
    function createRectRefs(el){
        el.cloneRef.rectRef = el.getBoundingClientRect();
        var style = window.getComputedStyle ? getComputedStyle(el, null) : el.currentStyle;
        el.cloneRef.styleRef = {
            top:{
                padding: parseInt(style.paddingTop,10),
                margin: parseInt(style.marginTop,10),
                border: parseInt(style.borderTopWidth,10)
            },
            left:{
                padding: parseInt(style.paddingLeft,10),
                margin: parseInt(style.marginLeft,10),
                border: parseInt(style.borderLeftWidth,10)
            }
        };
        if (!el.classList.contains('lmdd-block')){
            Array.prototype.forEach.call(el.childNodes,function(node){
                if (node.nodeType === 1){
                    createRectRefs(node);
                }
            })
        }
    }
    //helper functions for managing the animation layer
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
    function deleteReference(el) {
        delete(el.cloneRef);
        Array.prototype.forEach.call(el.childNodes, function (node) {
            deleteReference(node);
        });
    }
    function animate(el) {
        animateNode(el);
        if (!el.classList.contains('lmdd-block')) {
            Array.prototype.forEach.call(el.childNodes, function (node) {
                if (node.nodeType === 1) {
                    animate(node);
                }
            })
        }
    }
    function animateNode(elNode) {
        var cloneNode = elNode.cloneRef;
        var parentCloneNode = elNode.parentNode.cloneRef;
        cloneNode.style.position = "absolute";
        cloneNode.style.webkitBackfaceVisibility = "hidden";
        cloneNode.style.width = cloneNode.rectRef.width + "px";
        cloneNode.style.height =  cloneNode.rectRef.height + "px";
        cloneNode.style.display = "block";
        if (elNode === scope) {
            cloneNode.style.top = cloneNode.rectRef.top + window.pageYOffset + "px";
            cloneNode.style.left = cloneNode.rectRef.left + window.pageXOffset + "px";
        } else {
            var refContainer = (cloning) ? positions.referenceContainer.cloneRef : positions.originalContainer.cloneRef;
            var offsetX = cloneNode.rectRef.left - ((cloneNode === shadow) ? refContainer.rectRef.left : parentCloneNode.rectRef.left);
            var offsetY = cloneNode.rectRef.top - ((cloneNode === shadow) ? refContainer.rectRef.top : parentCloneNode.rectRef.top);
            var fixX = (cloneNode === shadow) ? refContainer.styleRef.left.border + refContainer.styleRef.left.padding + shadow.offsetFix.left :  parentCloneNode.styleRef.left.border + parentCloneNode.styleRef.left.padding + cloneNode.styleRef.left.margin;
            var fixY = (cloneNode === shadow) ? refContainer.styleRef.top.border + refContainer.styleRef.top.padding + shadow.offsetFix.top :  parentCloneNode.styleRef.top.border + parentCloneNode.styleRef.top.padding + cloneNode.styleRef.top.margin;
            cloneNode.style.transform = "translate3d(" + (offsetX - fixX) + "px, " + (offsetY - fixY) + "px,0px)";
        }
    }
    function updateMirrorLocation() {
        mirror.style.top = (lastEvent.pageY - parseInt(mirror.parentNode.style.top, 10) + scrollDelta.y - dragOffset.y) + "px";
        mirror.style.left = (lastEvent.pageX - parseInt(mirror.parentNode.style.left, 10) + scrollDelta.x - dragOffset.x) + "px";
    }
    //main
    function eventManager(event) {//handle events lifecycle and app status
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
                            }
                            else {
                                var target = getWrapper(event.target, scope.lmddOptions.draggableItemClass);
                                if (!target) {//not dragging a draggable
                                    killEvent();
                                }
                                else {
                                    scope.dispatchEvent(new CustomEvent('lmddbeforestart', {"bubbles": true}));
                                    dragOffset.x = event.clientX - target.getBoundingClientRect().left;
                                    dragOffset.y = event.clientY - target.getBoundingClientRect().top;
                                    setElements(target);
                                    if (document.body.setCapture) {
                                        document.body.setCapture(false);
                                        tasks.onDragEnd.push(function () {
                                            document.releaseCapture();
                                        });
                                    }
                                    clearInterval(calcInterval);//make sure interval was not set already
                                    calcInterval = window.setInterval(eventTicker, scope.lmddOptions.calcInterval);//calculation interval for mouse movement
                                    observer.observe(scope, {childList: true, subtree:true });
                                    if (!scope.lmddOptions.nativeScroll) {//disable native scrolling on mouse down
                                        event.preventDefault();
                                    }
                                    scope.dispatchEvent(createLmddEvent("lmddstart"));
                                    status = "dragStart";
                                    scrollManager.active = true;
                                }
                            }
                        }
                    }, scope.lmddOptions.dragstartTimeout);
                }
                break;
            case "dragStartTimeout":
                if(mousemoveCounter === 0){
                    mousemoveCounter ++;
                    return;
                }
                killEvent();
                break;
            case "dragStart":
                if ((event.type === "mousedown") || (event.type === "mouseup") || (event.type === "mousemove") && (event.buttons === 0)) {//or mousemove with no buttons in case mouseup event was not fired
                    if (!dragged) {
                        killEvent();
                        return;
                    }
                    scrollManager.active = false;
                    mirror.classList.add("gf-transition");
                    var mirrorRect = mirror.getBoundingClientRect();
                    var offsetX = mirrorRect.left - shadow.rectRef.left;
                    var offsetY = mirrorRect.top - shadow.rectRef.top;
                    var offset = getOffset(dragged, scope);
                    mirror.style.width = shadow.rectRef.width + "px";
                    mirror.style.height = shadow.rectRef.height + "px";
                    mirror.style.transform = "scale(1,1)";
                    mirror.style.top = offset.y + "px";
                    mirror.style.left = offset.x + "px";
                    if (Math.abs(offsetX) + Math.abs(offsetY) > 3) {//make a graceful finish...
                        status = "waitDragEnd";
                        tasks.onTransitionEnd.push(function () {
                            killEvent();
                        });
                    }
                    else{
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
            case "waitDragEnd":
                if (event.type === "transitionend") {
                    tasks.executeTask("onTransitionEnd");
                }
                if (event.type === "mouseup"){
                    killEvent();
                }
                break;
        }
    }
    function setElements(el) {//set animated and cloned elements
        if (el.classList.contains("lmdd-clonner")) {//clone the target
            cloning = true;
            clone = el.parentNode.insertBefore(el.cloneNode(true), el);
            clone.classList.remove("lmdd-clonner");//prevent the clone from acting as a clonner
            el.classList.add("no-display");//hide the cloned target until the original target will be positioned
            clone.elref = el;//create a reference to the original clonner
        }
        createReference(scope);//create a clone reference for every element on scope
        dragged = (cloning) ? clone : el;
        shadow = dragged.cloneRef;
        mirror = shadow.cloneNode(true);
        if (mirror.tagName === 'LI') {
            var wrapper = document.createElement('ul');
            wrapper.appendChild(mirror);
            wrapper.style.padding = 0;
            mirror.style.margin = 0;
            mirror = wrapper;
            mirror.wrapped = true;
        }
        toggleClass(dragged, "lmdd-hidden", true, "onDragEnd");
        shadow.classList.add("lmdd-shadow");
        updateOriginalPosition(dragged);
        positions.referenceContainer = positions.originalContainer;
        updateCurrentContainer();
        updateCurrentCoordinates();
        window.getSelection().removeAllRanges();//disable text selection on FF and IE - JS
        toggleClass(document.body, "unselectable", true, "onDragEnd");//disable text selection on CHROME - CSS
        scope.parentNode.appendChild(scope.cloneRef); //insert the clone into the dom
        tasks.onDragEnd.push(function () {
            scope.parentNode.removeChild(scope.cloneRef);
            deleteReference(scope);
        });
        var temp = shadow;
        while (scope.cloneRef.contains(temp)) {
            temp.style.zIndex = 0;
            temp = temp.parentNode;
        }
        var cStyle = window.getComputedStyle ? getComputedStyle(shadow, null) : shadow.currentStyle;
        shadow.offsetFix = {
            left : parseInt(cStyle.marginLeft, 10),
            top : parseInt(cStyle.marginTop, 10),
            parent : dragged.parentNode.cloneRef
        };
        createRectRefs(scope);
        animate(scope);
        mirror.classList.add("lmdd-mirror");
        var props = ['width','height','padding','paddingTop','paddingBottom','paddingLeft','paddingRight','lineHeight'];
        props.forEach(function(prop){
            if (mirror.wrapped){
                mirror.childNodes[0].style[prop] = cStyle[prop];
            }
            else{
                mirror.style[prop] = cStyle[prop];
            }
        });
        var scaleX = scope.lmddOptions.mirrorMaxWidth / shadow.getBoundingClientRect().width;
        var scaleY = scope.lmddOptions.mirrorMinHeight / shadow.getBoundingClientRect().height;
        var scale = Math.min(1, Math.max(scaleX, scaleY));
        dragOffset.x *= scale;
        dragOffset.y *= scale;
        mirror.style.transform = "scale(" + scale + "," + scale + ")";
        mirror.style.transformOrigin = "0 0";
        scope.cloneRef.appendChild(mirror);
        mirror.addEventListener("transitionend", eventManager, false);
        scrollDelta.lastX = window.pageXOffset;
        scrollDelta.lastY = window.pageYOffset;
        updateMirrorLocation();
        toggleClass(scope, "hidden-layer", true, "onDragEnd");
        toggleClass(scope.cloneRef, "visible-layer", true, false);
    }
    function eventTicker() {//interval function for updating and handling mouse movements while dragging
        if (!scope.lmddOptions.nativeScroll) {
            scrollManager.updateEvent(lastEvent);
        }
        if (refEvent === lastEvent) {
            return false;
        }
        if(refEvent && scope.lmddOptions.positionDelay){
            if(lastEvent.timeStamp - refEvent.timeStamp < scope.lmddOptions.calcInterval){
                return false;
            }
        }
        if (status !== "dragStart"){
            return false;
        }
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
    function killEvent() {//end current drag event
        observer.disconnect();
        clearInterval(calcInterval);
        calcInterval = null;
        mousemoveCounter = 0;
        scrollManager.active = false;
        if (cloning && !positioned) {
            clone.elref.classList.remove("no-display");
            clone.parentNode.removeChild(clone);
        }
        if (cloning) {
            updateOriginalPosition(clone.elref)
        }
        tasks.executeTask("onDragEnd");
        if (status !== "dragStartTimeout" && status !== "waitDragStart") {
            scope.dispatchEvent(createLmddEvent("lmddend"));
        }
        if (scope.lmddOptions.dataMode) {//undo DOM mutations
            if (positioned && cloning) {
                dragged.parentNode.removeChild(dragged);
            }
            else if (positioned) {
                positions.originalContainer.insertBefore(dragged, positions.originalNextSibling);
            }
        }
        positioned = false;
        cloning = false;
        status = "waitDragStart";
    }
    return {//exposed methods
        set: function (el, lmddOptions) {
            if (!el.lmdd) {
                clean(el);//get rid of whitespaces
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
            window.removeEventListener("touchstart", simulateMouseEvent);
            window.removeEventListener("touchmove", simulateMouseEvent, {passive: false});
            window.removeEventListener("touchend", simulateMouseEvent);
        }
    };
})();