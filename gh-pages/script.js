/**
 * Created by יאיר on 18/01/2017.
 */
lmdd.set(document.getElementById('clonner-example'), {
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
lmdd.set(document.getElementById('simple-grid-example'), {
    containerClass: 'simple-grid',
    draggableItemClass: 'grid-item'
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
lmdd.set(document.getElementById('nested-example'), {
    containerClass: 'nestable',
    draggableItemClass: 'nested-item'
});
lmdd.set(document.getElementById('nested-tree-example'), {
    containerClass: 'nestable-ul',
    draggableItemClass: 'nested-li'
});
document.addEventListener('lmddend',handleDrag,false);
function handleDrag(event){
    console.log(event.detail);
}
