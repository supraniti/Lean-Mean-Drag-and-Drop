///todo: wrappping it up,handle clone status,vuejs app (layoutbuilder)
var lmdd = (function () {
    var options = {
        containerClass: false,
        fixedItemClass: false,//fixed items can't be draggable
        draggableItemClass: false,
        handleClass: false,
        mirrorMinHeight: 100,
        mirrorMaxWidth: 500,
        revert: false,
        dragstartTimeout: 50,
        calcInterval: 200,
        nativeScroll: false,
        protectedProperties: ['padding', 'padding-top', 'padding-bottom', 'padding-right', 'padding-left', 'display', 'list-style-type', 'line-height'],
        matchObject: false
    };
    var elementManager = {
        dragged: null,//the dragged element
        shadow: null,//clone of the dragged element used as a visible placeholder
        mirror: null,//clone of the dragged element attached to the mouse cursor
        set: function (el) {
            createReference(scope);//create a clone reference for every element on scope
            this.dragged = el;
            this.shadow = this.dragged.cloneRef;
            var cStyle = (window.getComputedStyle) ? window.getComputedStyle(this.dragged, null) : this.dragged.currentStyle;
            for (var i = 0; i < scope.lmddOptions.protectedProperties.length; i++) {
                this.shadow.style[scope.lmddOptions.protectedProperties[i]] = cStyle[scope.lmddOptions.protectedProperties[i]];
            }
            this.mirror = this.shadow.cloneNode(true);
            toggleClass(this.dragged, 'lmdd-hidden', true, 'onDragEnd');
            this.shadow.classList.add('lmdd-shadow');
            this.mirror.classList.add('lmdd-mirror');
            updateOriginalPosition();
            updateCurrentContainer();
            updateCurrentCoordinates();
            window.getSelection().removeAllRanges();//disable text selection on FF and IE - JS
            toggleClass(document.body, 'unselectable', true, 'onDragEnd');//disable text selection on CHROME - CSS
            scope.parentNode.appendChild(scope.cloneRef); //insert the clone into the dom
            todo.onDragEnd.push(function () {
                scope.parentNode.removeChild(scope.cloneRef);
                deleteReference(scope);
            });
            scope.cloneRef.appendChild(this.shadow);//insert the shadow into the dom
            animateElement(scope);//take care of positioning
            this.mirror.style.width = this.shadow.getBoundingClientRect().width + 'px';
            this.mirror.style.height = this.shadow.getBoundingClientRect().height + 'px';
            var scaleX = scope.lmddOptions.mirrorMaxWidth / this.shadow.getBoundingClientRect().width;
            var scaleY = scope.lmddOptions.mirrorMinHeight / this.shadow.getBoundingClientRect().height;
            var scale = Math.min(1, Math.max(scaleX, scaleY));
            dragOffset.x *= scale;
            dragOffset.y *= scale;
            this.mirror.style.transform = 'scale(' + scale + ',' + scale + ')';
            this.mirror.style.transformOrigin = '0 0';
            scope.cloneRef.appendChild(this.mirror);
            scroll.lastX = window.pageXOffset;
            scroll.lastY = window.pageYOffset;
            updateMirrorLocation();
            toggleClass(scope, 'hidden-layer', true, 'onDragEnd');
            toggleClass(scope.cloneRef, 'visible-layer', true, false);
        },
        unset: function () {
            this.dragged = null;
            this.mirror = null;
            this.shadow = null;
        },
        move: function (event) {
            //mouse move
            //target changed
            //position changed
            //container changed
        }
    }
    var status = 'waitDragStart'; // dragStart, , waitDragEnd, dragEnd
    var calcInterval = null;
    var scroll = {
        lastX: window.pageXOffset,
        lastY: window.pageYOffset,
        get deltaX() {
            return window.pageXOffset - this.lastX;
        },
        get deltaY() {
            return window.pageYOffset - this.lastY;
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
    var assignOptions = function (defaults, settings) {
        var target = {};
        Object.keys(defaults).forEach(function (key) {
            target[key] = (Object.prototype.hasOwnProperty.call(settings, key) ? settings[key] : defaults[key]);
        });
        return target;
    };
    var simulateMouseEvent = function (event) {//convert touch to mouse events
        if (event.touches.length > 1) {
            return;
        }
        var simulatedType = (event.type === 'touchstart') ? 'mousedown' : (event.type === 'touchend') ? 'mouseup' : 'mousemove';
        var simulatedEvent = new MouseEvent(simulatedType, {
            'view': window,
            'bubbles': true,
            'cancelable': true,
            'screenX': (event.touches[0]) ? event.touches[0].screenX : 0,
            'screenY': (event.touches[0]) ? event.touches[0].screenY : 0,
            'clientX': (event.touches[0]) ? event.touches[0].clientX : 0,
            'clientY': (event.touches[0]) ? event.touches[0].clientY : 0,
            'button': 0,
            'buttons': 1
        });
        var eventTarget = (event.type === 'touchmove') ? document.elementFromPoint(simulatedEvent.clientX, simulatedEvent.clientY) || document.body : event.target;
        if (status === 'dragStart') {
            event.preventDefault();
        }
        eventTarget.dispatchEvent(simulatedEvent);
    };
    var scrollControl = function () {//replaces native scroll behaviour
        var stop = false, nested = false, container = false, scrollSpeed = false, action = false, rect = false;
        var timeoutVar, reh, veh1, veh2, rew, vew1, vew2, cspy, cspx, cmpy, cmpx, asm, mspy, mspx;
        var setContainer = function (el) {
            if (document.body.contains(el)) {
                var vScroll = false, hScroll = false, cStyle = window.getComputedStyle(el, null);
                if (el.offsetWidth > el.clientWidth && el.clientWidth > 0) {
                    var borderWidth = parseInt(cStyle.getPropertyValue('border-right-width'), 10) + parseInt(cStyle.getPropertyValue('border-left-width'), 10);
                    vScroll = (el.offsetWidth > el.clientWidth + borderWidth);
                }
                if (el.offsetHeight > el.clientHeight && el.clientHeight > 0) {
                    var borderHeight = parseInt(cStyle.getPropertyValue('border-right-height'), 10) + parseInt(cStyle.getPropertyValue('border-left-height'), 10);
                    hScroll = (el.offsetHeight > el.clientHeight + borderHeight);
                }
                return (vScroll || hScroll) ? el : setContainer(el.parentNode);
            }
            return (document.documentElement);
        };
        var newEvent = function (e) {
            stop = false;
            cmpy = (nested) ? e.clientY - rect.top : e.clientY;
            cmpx = (nested) ? e.clientX - rect.left : e.clientX;
            updateVars();
            scroll();
        };
        var updateVars = function () {
            reh = container.scrollHeight;//real element height
            veh1 = container.clientHeight;//visible element height without scroll bar
            veh2 = (nested) ? container.offsetHeight : window.innerHeight; //visible element height including scroll bar
            rew = container.scrollWidth;//real element width
            vew1 = container.clientWidth;//visible element width without scroll bar
            vew2 = (nested) ? container.offsetWidth : window.innerWidth;// visible element width including scroll bar
            cspy = (nested) ? container.scrollTop : window.pageYOffset;//current scroll point on Y axis
            cspx = (nested) ? container.scrollLeft : window.pageXOffset;//current scroll point on X axis
            asm = 20;
            mspy = reh - veh1;//maximum scroll point on Y axis
            mspx = rew - vew1;//maximum scroll point on X axis
            scrollSpeed = Math.max(asm - cmpx, asm - cmpy, cmpx + asm - vew1, cmpy + asm - veh1);//distance between cursor and scroll margin
        };
        var scroll = function () {
            clearTimeout(timeoutVar);
            action = false;
            if (stop) {
                return false;
            }
            if ((cspx > 0) && (cmpx <= asm)) {//left
                action = true;
                (nested) ? container.scrollLeft -= scrollSpeed : window.scrollTo(cspx - scrollSpeed, cspy);
            }
            if ((rew > vew2) && (cspx < mspx) && (cmpx + asm >= vew1)) {//right
                action = true;
                (nested) ? container.scrollLeft += scrollSpeed : window.scrollTo(cspx + scrollSpeed, cspy);
            }
            if ((cspy > 0) && (cmpy <= asm)) {//top
                action = true;
                (nested) ? container.scrollTop -= scrollSpeed : window.scrollTo(cspx, cspy - scrollSpeed);
            }
            if ((reh > veh2) && (cspy < mspy) && (cmpy + asm >= veh1)) {//bottom
                action = true;
                (nested) ? container.scrollTop += scrollSpeed : window.scrollTo(cspx, cspy + scrollSpeed);
            }
            if (action) {
                updateVars();
                timeoutVar = setTimeout(scroll, 16);
            }
        };
        var eventHandler = function (e) {
            container = setContainer(e.target);
            rect = container.getBoundingClientRect();
            nested = (container !== document.documentElement);
            newEvent(e);
        }
        return {
            update: function (e) {
                eventHandler(e);
            },
            kill: function () {
                stop = true;
            }
        };
    };
    var scrollController = scrollControl();
    var updateOriginalPosition = function () {
        positions.originalContainer = elementManager.dragged.parentNode;
        positions.originalNextSibling = elementManager.dragged.nextSibling;
    };
    var updateCurrentContainer = function () {
        positions.previousContainer = positions.currentContainer;
        if (positions.currentTarget !== lastEvent.target) {
            positions.currentTarget = lastEvent.target;
            positions.currentContainer = getWrapper(lastEvent.target, scope.lmddOptions.containerClass);
        }
    };
    var updateCurrentCoordinates = function () {
        if (positions.currentContainer) {
            positions.currentCoordinates = getCoordinates(positions.currentContainer);
        }
        else {
            positions.currentCoordinates = getCoordinates(positions.originalContainer);
        }
    };
    var updateCurrentPosition = function () {
        positions.previousPosition = positions.currentPosition;
        if (positions.currentContainer) {
            positions.currentPosition = getPosition(positions.currentCoordinates, lastEvent.clientY, lastEvent.clientX);
        }
        else {
            positions.currentPosition = false;
        }
    };
    var appendDraggedElement = function () {
        if ((positions.currentContainer) && (acceptDrop(positions.currentContainer, elementManager.dragged))) {
            positions.currentContainer.insertBefore(elementManager.dragged, positions.currentContainer.childNodes[positions.currentPosition]);
            todo.executeTask('onNextAppend');
        }
        else {
            if (scope.lmddOptions.revert) {
                positions.originalContainer.insertBefore(elementManager.dragged, positions.originalNextSibling);
            }
        }
        updateCurrentCoordinates();
        animateElement(scope);
    };
    var acceptDrop = function (container, item) {
        if (item.contains(container)) {
            return false;
        }
        if (container.classList.contains('lmdd-dispatcher')) {
            return false;
        }
        if (scope.lmddOptions.matchObject) {
            var cType = container.dataset.containerType || false;
            var iType = item.dataset.itemType || false;
            return ((cType) ? ((iType) ? scope.lmddOptions.matchObject [cType][iType] : scope.lmddOptions.matchObject[cType]['default']) : scope.lmddOptions.matchObject['default']);
        }
        return true;
    };
    var toggleClass = function (el, className, action, undo) {
        (action) ? el.classList.add(className) : el.classList.remove(className);
        if (undo) {
            todo[undo].push(function () {
                (action) ? el.classList.remove(className) : el.classList.add(className)
            });
        }
    };
    var toggleEvent = function (el, listener, fn, useCapture, undo) {
        el.addEventListener(listener, fn, useCapture);
        todo[undo].push(function () {
            el.removeEventListener(listener, fn, useCapture);
        });
    };
    var cleanNode = function (node) {//clean empty nodes
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
            }
        }
    };
    var getOffset = function (el1, el2) {//todo:double check on IE
        var rect1 = el1.getBoundingClientRect(),
            rect2 = el2.getBoundingClientRect();
        var borderWidth = {
            left: parseInt(window.getComputedStyle(el2, null).getPropertyValue('border-left-width'), 10),
            top: parseInt(window.getComputedStyle(el2, null).getPropertyValue('border-top-width'), 10)
        };
        return {
            x: rect1.left - rect2.left - borderWidth.left,
            y: rect1.top - rect2.top - borderWidth.top
        };
    };
    var getWrapper = function (el, wrapperClass) {
        var path = [];
        var wrapper = false;
        for (; el && el !== document; el = el.parentNode) {
            path.unshift(el);
            if ((el.classList.contains(wrapperClass)) && (!wrapper)) {
                wrapper = el;
            }
        }
        return (path.indexOf(scope) > -1) ? wrapper : false;
    };
    var deleteReference = function (el) {
        delete(el.cloneRef);
        Array.prototype.forEach.call(el.childNodes, function (node) {
            deleteReference(node);
        });
    };
    var animateElement = function (el) {
        if (el.nodeType === 1) {
            animateNode(el);
            if (el.classList.contains(scope.lmddOptions.containerClass) || (el === scope)) {
                if (el !== elementManager.dragged) {
                    el.cloneRef.style.display = 'block';
                    el.cloneRef.style.padding = 0;
                    Array.prototype.forEach.call(el.childNodes, function (node) {
                        animateElement(node);
                    });
                }
            }
        }
    };
    var animateNode = function (elNode) {
        var cloneNode = elNode.cloneRef;
        var elRect = elNode.getBoundingClientRect();
        var offset;
        cloneNode.style.position = 'absolute';
        cloneNode.style.width = (elRect.width) + 'px';
        cloneNode.style.height = (elRect.height) + 'px';
        cloneNode.style.margin = 0;
        if (elNode === scope) {
            cloneNode.style.top = elRect.top + window.pageYOffset + 'px';
            cloneNode.style.left = elRect.left + window.pageXOffset + 'px';
        } else {
            offset = (elNode === elementManager.dragged) ? getOffset(elNode, scope) : getOffset(elNode, elNode.parentNode);
            cloneNode.style.transform = 'translate3d(' + offset.x + 'px, ' + offset.y + 'px,0px)';
        }
    };
    var getCoordinates = function (el) {
        var coordinates = [];
        Array.prototype.forEach.call(el.childNodes, function (node, index) {
            if (node.nodeType === 1) {
                var coordinate = node.getBoundingClientRect();
                coordinate.index = index;
                if (!node.classList.contains('fixed')) {
                    coordinates.push(coordinate);
                }
            }
        });
        return coordinates;
    };
    var getPosition = function (coordinates, top, left) {
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
    };
    var updateMirrorLocation = function () {
        if (elementManager.mirror) {
            elementManager.mirror.style.top = (lastEvent.pageY - parseInt(elementManager.mirror.parentNode.style.top, 10) + scroll.deltaY - dragOffset.y) + 'px';
            elementManager.mirror.style.left = (lastEvent.pageX - parseInt(elementManager.mirror.parentNode.style.left, 10) + scroll.deltaX - dragOffset.x) + 'px';
        }
    };
    var createReference = function (el) {
        var clone = el.cloneNode(true);
        clone.id += '-lmddClone';
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
    };
    var muteEvent = function (event) {
        event.preventDefault();
        event.stopPropagation();
        return false;
    };
    var killEvent = function () {
        scrollController.kill();
        clearInterval(calcInterval);
        calcInterval = null;
        if (scope.check) {
            toggleClass(scope.cloned, 'no-display', false, false);
            if (scope.check.parentNode) {
                scope.check.parentNode.removeChild(scope.check);
            }
            ;
        }
        todo.executeTask('onDragEnd');
        if (status !== 'dragStartTimeout') {
            var event = new CustomEvent('lmddend', {
                'detail': {
                    'draggedElement': elementManager.dragged,
                    'originalContainer': positions.originalContainer,
                    'originalNextSibling': positions.originalNextSibling,
                    'currentContainer': elementManager.dragged.parentNode,
                    'currentNextSibling': elementManager.dragged.nextSibling
                }
            });
            scope.dispatchEvent(event);
            console.log(event.detail);
        }
        scope = false;
        lastEvent = false;
        status = 'waitDragStart';
    };
    var eventTicker = function () {
        if (scope) {
            if (!scope.lmddOptions.nativeScroll) {
                scrollController.update(lastEvent)
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
    };
    var eventManager = function (event) {
        switch (status) {
            case 'waitDragStart':
                if ((event.type === 'mousedown') && (event.button === 0)) {//trigger timeout function to enable clicking and text selection
                    scope = this;
                    lastEvent = event;
                    toggleEvent(window, 'mouseup', eventManager, false, 'onDragEnd');
                    toggleEvent(document, 'mousemove', eventManager, false, 'onDragEnd');
                    toggleEvent(document, 'scroll', eventManager, false, 'onDragEnd');
                    status = 'dragStartTimeout';
                    window.setTimeout(function () {
                        if (status === 'dragStartTimeout') {//no events fired during the timeout
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
                                    if (!scope.lmddOptions.nativeScroll) {
                                        event.preventDefault();//disable native scrolling on mouse down
                                    }
                                    if (target.classList.contains('lmdd-clonner')) {//clone the target
                                        scope.cloned = target.parentNode.insertBefore(target.cloneNode(true), target);
                                        scope.check = target;
                                        target.classList.remove('lmdd-clonner');
                                        toggleClass(scope.cloned, 'no-display', true, 'onNextAppend');
                                        todo.onNextAppend.push(function () {
                                            toggleClass(scope.cloned.cloneRef, 'no-display', false, false);
                                            toggleClass(scope.cloned.cloneRef, 'no-transition', true, 'onDragEnd');
                                            updateOriginalPosition();
                                            scope.check = false;
                                        });
                                    }
                                    dragOffset.x = event.clientX - target.getBoundingClientRect().left;
                                    dragOffset.y = event.clientY - target.getBoundingClientRect().top;
                                    elementManager.set(target);
                                    elementManager.shadow.addEventListener("transitionend", eventManager, false);
                                    if (document.body.setCapture) {
                                        document.body.setCapture(false);
                                        todo.onDragEnd.push(function () {
                                            document.releaseCapture();
                                        });
                                    }
                                    clearInterval(calcInterval);//set tick function
                                    calcInterval = window.setInterval(eventTicker, scope.lmddOptions.calcInterval);//calculation interval for mouse movement
                                }
                            }
                            status = 'dragStart';
                        }
                    }, scope.lmddOptions.dragstartTimeout);
                }
                break;
            case 'dragStartTimeout':
                killEvent();
                break;
            case 'dragStart':
                if ((event.type === 'mousedown') || (event.type === 'mouseup') || (event.type === 'mousemove') && (event.buttons === 0)) {//or mousemove with no buttons in case mouseup event was not fired
                    elementManager.mirror.classList.add('gf-transition');
                    if (!elementManager.dragged) {
                        killEvent();
                        return;
                    }
                    var offset = getOffset(elementManager.dragged, scope);
                    elementManager.mirror.style.transform = 'scale(1,1)';
                    elementManager.mirror.style.top = offset.y + 'px';
                    elementManager.mirror.style.left = offset.x + 'px';
                    elementManager.mirror.style.width = elementManager.dragged.getBoundingClientRect().width + 'px';
                    elementManager.mirror.style.height = elementManager.dragged.getBoundingClientRect().height + 'px';
                    offset = getOffset(elementManager.dragged, elementManager.shadow);
                    if (Math.abs(offset.x) + Math.abs(offset.y) > 0) {//wait for transition to finish
                        status = 'waitDragEnd';
                        todo.onTransitionEnd.push(function () {
                            killEvent();
                        });
                        window.setTimeout(function () {
                            if (status !== 'waitDragStart') {
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
                if (event.type === 'mousemove') {
                    lastEvent = event;
                    scroll.lastX = window.pageXOffset;
                    scroll.lastY = window.pageYOffset;
                    updateMirrorLocation();
                }
                if (event.type === 'scroll') {
                    updateMirrorLocation();
                    updateCurrentCoordinates();
                }
                break;
            case'waitDragEnd':
                if (event.type === 'transitionend') {
                    if (event.propertyName === 'transform') {
                        todo.executeTask('onTransitionEnd');
                    }
                }
                break;
        }
    };
    return {
        set: function (el, lmddOptions) {
            if (!el.lmdd) {
                cleanNode(el);//get rid of whitespaces
                el.lmdd = true;
                el.lmddOptions = assignOptions(options, lmddOptions);//create options object
                console.log(el.lmddOptions);
                el.addEventListener('mousedown', eventManager, false);
                document.addEventListener('drag', muteEvent, false);
                document.addEventListener('dragstart', muteEvent, false);
                window.addEventListener('touchstart', simulateMouseEvent);
                window.addEventListener('touchmove', simulateMouseEvent, {passive: false});
                window.addEventListener('touchend', simulateMouseEvent);
            }
        },
        refresh: function (el) {
        },
        unset: function (el) {
            if (el.lmdd) {
                el.removeEventListener('mousedown', eventManager, false);
                el.lmdd = false;
                delete(el.lmddOptions);
            }
        },
        kill: function () {
            document.removeEventListener('drag', muteEvent, false);
            document.removeEventListener('dragstart', muteEvent, false);
        },
        getStatus: function () {
            return status;
        }
    };
})();
