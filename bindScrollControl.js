/**
 * <div id="mainId" width="100px">
 *   <div width="100px">
 *     <div width = "20000px">
 *     </div>
 *   </div>
 * </div>
 */
function bindScrollControl(id, lmap) {
    var element = document.getElementById(id);
    var mouseX;
    var mouseOver;
    var scroll = false;

    element.onmousedown = function (e) {
        if (mouseOver) {
            currScroll = element.scrollLeft;
            mouseX = e.clientX;
            scroll = true;
            document.body.classList.add("ntDisselect");
        }
    };

    var currScroll = 0;

    element.onmouseup = function () {
        scroll = false;
        document.body.classList.remove("ntDisselect");
    };

    element.onmouseover = function () {
        mouseOver = true;
    };

    element.onmouseleave = function () {
        mouseOver = false;
    };

    $(document.body).on("mousemove", function (e) {
        if (scroll) {
            element.scrollLeft = currScroll - e.clientX + mouseX;
        }
    });

    $(document.body).on("mouseup", function (e) {
        if (scroll) {
            scroll = false;
        }
    });

    /**
    ===================
        Touchable
    ===================
    **/
    document.addEventListener('touchmove', function (e) {
        if (scroll) {
            e.preventDefault();
            element.scrollLeft = currScroll - e.changedTouches[0].pageX + mouseX;
        }
    }, false);

    document.addEventListener("touchend", function (e) {
        if (scroll) {
            scroll = false;
        }
        lmap && lmap.dragging.enable();
    });

    element.ontouchstart = function (e) {
        currScroll = element.scrollLeft;
        lmap && lmap.dragging.disable();
        e.preventDefault();
        mouseX = e.changedTouches[0].pageX;
        scroll = true;
        document.body.classList.add("ntDisselect");
    };

};

