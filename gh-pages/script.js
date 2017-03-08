/**
 * Created by יאיר on 18/01/2017.
 */
lmdd.set(document.getElementById('simple-example'), {
    containerClass: 'nestable',
    draggableItemClass: 'rectangle'
});
lmdd.set(document.getElementById('first-example'), {
    containerClass: 'example-container',
    fixedItemClass: false,
    draggableItemClass: 'example-item',
    handleClass: false,
    regulateMouseOver: false,
    mirrorMinHeight: 100,
    mirrorMaxWidth: 500,
    revert: false,
    clone: false,
    dataMode:true
});
lmdd.set(document.getElementById('clone-example'), {
    containerClass: 'nestable',
    draggableItemClass: 'item',
    handleClass: false,
    regulateMouseOver: false,
    mirrorMinHeight: 100,
    mirrorMaxWidth: 500,
    revert: false,
    clone: false
});
lmdd.set(document.getElementById('simple-example-2'), {
    containerClass: 'nestable',
    fixedItemClass: false,
    draggableItemClass: 'item',
    handleClass: 'handle',
    regulateMouseOver: false,
    revert: false,
    clone: false
});
lmdd.set(document.getElementById('markup-example'), {
    containerClass: 'nestable',
    fixedItemClass: false,
    draggableItemClass: 'item',
    handleClass: false,
    regulateMouseOver: false,
    mirrorMinHeight: 100,
    revert: true,
    clone: false
});
lmdd.set(document.getElementById('match-example'), {
    containerClass: 'img-grid',
    fixedItemClass: false,
    draggableItemClass: 'img-item',
    handleClass: false,
    revert: true,
    matchObject: {
        "default":true,
        "yellow":{
            "default": true,
            "yellow": true
        },
        "red":{
            "default": false,
            "red": true
        }
    }
});
document.addEventListener('lmddend',handleDrag,false);
function handleDrag(event){
    console.log(event.detail);
}