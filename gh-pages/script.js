/**
 * Created by יאיר on 18/01/2017.
 */
lmdd.set(document.getElementById('simple-example'), {
    falseNegative:'check',
    containerClass: 'nestable',
    fixedItemClass: false,
    draggableItemClass: 'item',
    handleClass: false,
    regulateMouseOver: false,
    mirrorMaxHeight: 100,
    revert: true,
    clone: false
});
lmdd.set(document.getElementById('first-example'), {
    containerClass: 'example-container',
    fixedItemClass: false,
    draggableItemClass: 'example-item',
    handleClass: false,
    regulateMouseOver: false,
    mirrorMinHeight: 100,
    mirrorMaxWidth: 500,
    revert: true,
    clone: false
});
lmdd.set(document.getElementById('clone-example'), {
    containerClass: 'nestable',
    fixedItemClass: false,
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


