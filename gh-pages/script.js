/**
 * Created by יאיר on 18/01/2017.
 */
lmdd.init(document.getElementById('simple-example'),{
    containerClass:'myConatainer',
    itemClass:'myItem',
    draggableItemClass:'myDraggableItem',
    handleClass:'handle',
    protectedStyleProperties:['padding','paddingTop','paddingBottom','paddingLeft','paddingRight'],
    mirrorMaxHeight:500
});
lmdd.init(document.getElementById('simple-example-2'));
lmdd.init(document.getElementById('markup-example'));