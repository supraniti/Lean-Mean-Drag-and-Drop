/**
 * Created by יאיר on 18/01/2017.
 */
lmdd.init(document.getElementById('simple-example'),{
    containerClass:'nestable',
    fixedItemClass:false,
    draggableItemClass:'item',
    handleClass:false,
    regulateMouseOver:false,
    mirrorMaxHeight:100,
    mirrorMaxWidth:300,
    revert:false,
    clone:false
});
lmdd.init(document.getElementById('first-example'),{
    containerClass:'example-container',
    fixedItemClass:false,
    draggableItemClass:'example-item',
    handleClass:false,
    regulateMouseOver:false,
    mirrorMaxHeight:100,
    mirrorMaxWidth:300,
    revert:false,
    clone:false
});
lmdd.init(document.getElementById('clone-example'),{
    containerClass:'nestable',
    fixedItemClass:false,
    draggableItemClass:'item',
    handleClass:false,
    regulateMouseOver:false,
    mirrorMaxHeight:100,
    mirrorMaxWidth:300,
    revert:false,
    clone:false
});
lmdd.init(document.getElementById('simple-example-2'),{
    containerClass:'nestable',
    fixedItemClass:false,
    draggableItemClass:'item',
    handleClass:'handle',
    regulateMouseOver:false,
    mirrorMaxHeight:100,
    mirrorMaxWidth:300,
    revert:false,
    clone:false
});
lmdd.init(document.getElementById('markup-example'),{
    containerClass:'nestable',
    fixedItemClass:false,
    draggableItemClass:'item',
    handleClass:false,
    regulateMouseOver:false,
    mirrorMaxHeight:100,
    mirrorMaxWidth:300,
    revert:false,
    clone:false
});

// var getScrollContainer = function(el){
//     return(el.scrollWidth>el.clientWidth||el.scrollHeight>el.clientHeight)?el:(el.parentNode===document.body||el===document.body)?document:getScrollContainer(el.parentNode);
// }
var scrollControl = {
    pendingEvent:false,
    body:false,
    event:false,
    target:false,
    container:false,
    parent:false,
    speed:false,
    update:function(event){
        this.pendingEvent = event;
    },
    updateContainers:function(){
        this.container = this.getScrollContainer(this.target);
    },
    tick:function(){
        this.speed = this.pendingEvent.timeStamp - this.event.timeStamp;
        if (this.pendingEvent.target !== this.event.target){
            this.target = this.pendingEvent.target;
            this.updateContainers();
        };
        this.event = this.pendingEvent;
        this.scroll();
    },
    get el(){
        if (!this.event){
            return document.documentElement
        }
        else{
            return this.container;
        }
    },
    getScrollContainer:function(el){
        if(document.body.contains(el)) {
            var vScroll = false;
            var hScroll = false;
            var cStyle = window.getComputedStyle(el, null);
            if (el.offsetWidth > el.clientWidth && el.clientWidth > 0) {
                var borderWidth = parseInt(cStyle.getPropertyValue('border-right-width')) + parseInt(cStyle.getPropertyValue('border-left-width'));
                vScroll = (el.offsetWidth > el.clientWidth + borderWidth);
            }
            if (el.offsetHeight > el.clientHeight && el.clientHeight > 0) {
                var borderHeight = parseInt(cStyle.getPropertyValue('border-right-height')) + parseInt(cStyle.getPropertyValue('border-left-height'));
                hScroll = (el.offsetHeight > el.clientHeight + borderHeight);
            }
            return (vScroll || hScroll) ? el : this.getScrollContainer(el.parentNode);
        }
        return (document.documentElement);
    },
    // el:document.getElementById('dimension'),//document,
    scrollMargin:20,
    maxSpeed:20,
    getOffsetX:function(){
      return this.event.clientX - this.container.getBoundingClientRect().left;
    },
    getOffsetY:function(){
        return this.event.clientY - this.container.getBoundingClientRect().top;
    },
    get reh(){return this.el.scrollHeight;},//real element height
    get veh1(){return this.el.clientHeight;},//visual element height (without scroll bar)
    get veh2(){return (this.el === document.documentElement) ?  window.innerHeight : this.el.offsetHeight;},//visual element height (with scroll bar)
    get rew(){return this.el.scrollWidth;},//real element width
    get vew1(){return this.el.clientWidth;},//visual element width (without scroll bar)
    get vew2(){return (this.el === document.documentElement) ?  window.innerWidth : this.el.offsetWidth;},//visual element width (with scroll bar)
    get cspy(){return (this.el === document.documentElement) ?  window.pageYOffset : this.el.scrollTop;},//current scroll position on y axis
    get cspx(){return (this.el === document.documentElement) ?  window.pageXOffset : this.el.scrollLeft;},//current scroll position on x axis
    get cmpy(){return (this.el === document.documentElement) ? this.event.clientY: this.getOffsetY();},//current mouse position y
    get cmpx(){return (this.el === document.documentElement) ? this.event.clientX: this.getOffsetX();},//current mouse position x
    get asm(){return this.scrollMargin/window.devicePixelRatio;},//adjust scroll margin to browser zoom
    get mspy(){return this.reh - this.veh1;},//maximum scroll position on y axis
    get mspx(){return this.rew - this.vew1;},//maximum scroll position on x axis
    get scrollSpeed(){
        var max = (Math.max(this.asm - this.cmpx,this.asm - this.cmpy,this.cmpx + this.asm - this.vew1,this.cmpy + this.asm - this.veh1))
        return max/5;
    },
    get action(){
        if ((this.cspx > 0)&&(this.cmpx  <= this.asm)){//possible to scroll left + scroll left intention
            return ('left');
        }
        if ((this.rew > this.vew2)&&(this.cspx < this.mspx)&&(this.cmpx + this.asm >= this.vew1)){
            return ('right');
        }
        if ((this.cspy > 0)&&(this.cmpy  <= this.asm)){
            return ('top');
        }
        if ((this.reh > this.veh2)&&(this.cspy < this.mspy)&&(this.cmpy + this.asm >= this.veh1)){
            return ('bottom');
        }
        return false;
    },
    scroll:function(){
        if ((this.action)&&(!this.animate)){
            animationFrame = setInterval(function(){scrollControl.scroll()},10);
            this.animate = true;
        }
        if (this.action === 'top'){
            // console.log('scrolling')
            if (this.el === document.documentElement){
                window.scrollTo(this.cspx, this.cspy - this.scrollSpeed);
            }
            else{
                this.container.scrollTop-=this.scrollSpeed;
            }
        }
        if (this.action === 'bottom'){
            if (this.el === document.documentElement) {
                window.scrollTo(this.cspx, this.cspy + this.scrollSpeed);
            }
            else{
                this.container.scrollTop+=this.scrollSpeed;
            }
        }
        if (this.action === 'left'){
            if (this.el === document.documentElement) {
                window.scrollTo( this.cspx - this.scrollSpeed, this.cspy);
            }
            else{
                this.container.scrollLeft-=this.scrollSpeed;
            }
        }
        if (this.action === 'right'){
            if (this.el === document.documentElement) {
                window.scrollTo( this.cspx + this.scrollSpeed, this.cspy);
            }
            else{
                this.container.scrollLeft+=this.scrollSpeed;
            }
        }
        if (!this.action){
            clearInterval(animationFrame);
            this.animate = false;
        }
    },
    animate:false
}

var animationFrame;
var scrollMousedown = function(event) {
    if (event.button === 0){
        // event.preventDefault();
        if (document.body.setCapture){document.body.setCapture(false);};
        window.addEventListener('mousemove', scrollMousemove);
        window.addEventListener('mouseup', scrollMouseup);
    }
};
var scrollMousemove = function(event){
    if (event.buttons !== 0){
        scrollControl.update(event);
        // scrollControl.scroll();
    }
    else{
        scrollMouseup(event);
    }
};
var scrollMouseup = function(event){
    scrollControl.animate = false;
    clearInterval(animationFrame);
    document.body.classList.remove('unselectable');
    document.body.removeEventListener('mousemove', scrollMousemove);
    window.removeEventListener('mouseup', scrollMouseup);
    if (document.body.setCapture){document.body.releaseCapture()};
};

var appTimer = function(){
    scrollControl.tick();
}
var lastEventCache = false;
var eventManager = function(event){
    if ((event.type === 'mousedown')&&(event.button === 0)){
        window.setTimeout(dragHasStarted,200);
    }
    lastEventCache = event;
}
var dragHasStarted = function(){
    if (lastEventCache.type === 'click'){
        console.log('just a click...')
    }
    else if(window.getSelection().anchorOffset !== window.getSelection().focusOffset){
        console.log('selecting...')
    }
    else{
        window.addEventListener('mouseup', scrollMouseup);
        window.getSelection().removeAllRanges();
        document.body.classList.add('unselectable');
        console.log('dragstart');
    }
}

// var muteEvent = function(){console.log('muting...');return false;}
// document.body.addEventListener('selectionchange',muteEvent);
//
// window.setInterval(appTimer,200);
// document.body.addEventListener ('mousedown',scrollMousedown);
// document.body.addEventListener ('mousedown',eventManager);
// document.body.addEventListener ('selectstart',eventManager);
// document.body.addEventListener ('click',eventManager);


