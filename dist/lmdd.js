////todos:

var lmdd = (function() {
    var scope = {};
    var draggableClass = 'rectangle'; //add lmdd-draggable
    var handleClass = ''; //add lmdd-handle
    var containerClass = 'nestable'; //add lmdd-container
    var draggedElement = false;
    var draggedClone = false;
    var mirror = false;
    var mouseLocation = {
        top: -1,
        left: -1,
        clientX: -1,
        clientY: -1,
        lastScrollX: -1,
        lastScrollY: -1,
        get container() {
            var container = document.elementFromPoint(this.clientX, this.clientY);
            return (container) ? (container.classList.contains('lmdd-container') ? container : false) : false;
        },
        get coordinates() {
            return ((this.container) ? getCoordinates(this.container) : false);
        },
        get position() {
            return getPosition(this.coordinates, this.clientY, this.clientX)
        },
    };
    var cleanNode = function(node) {
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
        })
    };
    var animateNode = function(elNode) {
        var cloneNode = elNode.cloneRef;
        var elRect = elNode.getBoundingClientRect();
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
    var muteEvent = function(event) {
        event.preventDefault();
        return false;
    };
    var getCoordinates = function(el) {
        var coordinates = [];
        el.childNodes.forEach(function(node, index) { //replace with getelementbyclassname
            if (node.nodeType === 1){
                var cordinate = node.getBoundingClientRect();
                cordinate.index = index;
                coordinates.push(cordinate);
            }
        });
        return coordinates;
    };
    var getPosition = function(coordinates, top, left) {
        var length = coordinates.length;
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
            position = null;
        }
        return position; //position of nextSibling for insertbefore function
    };
    var dragEnded = function(event) {
        if (draggedElement) {
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
        if (event.button === 0) {
            document.body.classList.toggle('unselectable');
            scope = el;//reverse
            event.stopPropagation();
            scope.animation.init();//reverseVV
            draggedElement = event.target;//reverse
            setDraggedClone();//reverseVV
            setMirror();//reverseVV
            draggedElement.classList.toggle('lmdd-hidden');//reverse
        };
    };
    var setDraggedClone = function(el) {
        draggedClone = draggedElement.cloneRef;//reverse
        draggedClone.classList.toggle('lmdd-dragged');//reverse
        scope.cloneRef.appendChild(draggedClone);//reverse
        animateNode(draggedElement);
    };
    var updateMirrorLocation = function() {
        // mirror.style.top = (mouseLocation.clientY - (mirror.getBoundingClientRect().height / 2)) + 'px';
        // mirror.style.left = (mouseLocation.clientX - (mirror.getBoundingClientRect().width / 2)) + 'px';
        var offset = getOffset(mirror,mirror.parentNode);
        // var offset = (elNode === draggedElement)?getOffset(elNode, scope):getOffset(elNode, elNode.parentNode);
        // cloneNode.style.transform = 'translate(' + offset.x + 'px, ' + offset.y + 'px)';
        console.log(mirror.getBoundingClientRect().top,mirror.parentNode.getBoundingClientRect().top);
        mirror.style.top = (mouseLocation.clientY - parseInt(mirror.parentNode.style.top) + window.scrollY) + 'px';
        mirror.style.left = (mouseLocation.clientX - parseInt(mirror.parentNode.style.left) + window.scrollX) + 'px';
    };
    var setMirror = function() {
        mirror = draggedClone.cloneNode(true);
        mirror.classList.toggle('lmdd-mirror');
        mirror.classList.toggle('lmdd-dragged');
        mirror.style.width = draggedClone.getBoundingClientRect().width + 'px';
        mirror.style.height = draggedClone.getBoundingClientRect().height + 'px';
        var scaleX = Math.min(300/draggedClone.getBoundingClientRect().width,1);
        var scaleY = Math.min(100/draggedClone.getBoundingClientRect().height,1);
        mirror.style.transform = 'scale(' + scaleY + ',' + scaleY + ')';
        mirror.style.transformOrigin = '0 0';
        //document.body.append(mirror);
        scope.cloneRef.appendChild(mirror);
        // updateMirrorLocation();
        //scope.animation.refresh();
        updateMirrorLocation();
    };
    var unsetMirror = function() {
        //document.body.removeChild(mirror);
        scope.cloneRef.removeChild(mirror);
        mirror = false;
    };
    var mouseLocationUpdated = function(event) {
        mouseLocation.pageY = event.pageY;
        mouseLocation.pageX = event.pageX;
        mouseLocation.clientX = event.clientX;
        mouseLocation.clientY = event.clientY;
        if (mirror) {
            updateMirrorLocation();
        };
        if ((mouseLocation.container) && (mouseLocation.container.original)&&(draggedElement)) {
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
        };
    }
    var animation = function(el, excludedChildNodes) {
        this.el = el;
        this.init = function() {
            this.clone = el.cloneNode(true);
            this.clone.removeAttribute('id');
            createReference(this.el,this.clone);//reverseVV
            this.refresh();
            scope.parentNode.append(this.clone); //reverseVV
            // document.body.append(this.clone); //reverseVV
            this.clone.classList.toggle('visible-layer'); //reverseVV
            this.el.classList.toggle('hidden-layer'); //reverseVV
        };
        this.refresh = function() {
            animateElement(this.el, this.clone);
        };
        this.kill = function() {
            scope.parentNode.removeChild(this.clone); //reverseVV
            // document.body.removeChild(this.clone);
            this.clone = {};
            this.el.classList.toggle('hidden-layer');
            deleteReference(this.el);
        };
        return this;
    };
    return {
        init: function(el) {
            console.log('init',el)
            cleanNode(el);
            //get read of drag events
            document.addEventListener("drag", muteEvent, false); //reverse
            document.addEventListener("dragstart", muteEvent, false); //reverse
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
            }
            //record mouse movements
            document.addEventListener("mousemove", mouseLocationUpdated); //reverse
            document.addEventListener("scroll", mouseLocationUpdated);
            window.addEventListener("mouseup", dragEnded); //reverse
            //create animation object
            el.animation = new animation(el);
        }
    };
})();