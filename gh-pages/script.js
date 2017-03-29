/**
 * Created by יאיר on 18/01/2017.
 */
lmdd.set(document.getElementById('simple-grid-example'), {
    containerClass: 'simple-grid',
    draggableItemClass: 'grid-item'
});
lmdd.set(document.getElementById('nested-example'), {
    containerClass: 'nestable',
    draggableItemClass: 'nested-item',
    positionDelay:true
});
lmdd.set(document.getElementById('handle-example'), {
    containerClass: 'handle-grid',
    draggableItemClass: 'handle-item',
    handleClass:'handle'
});
lmdd.set(document.getElementById('features'), {
    containerClass: 'feature-grid',
    draggableItemClass: 'feature-item'
});

var check = document.getElementById('nested-example');
check.addEventListener('lmddbeforestart',eventHandler);
check.addEventListener('lmddstart',eventHandler);
check.addEventListener('lmddend',eventHandler);
function eventHandler(event){
    console.log(event,event.detail);
}
