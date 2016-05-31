var NDVITimelineSlider = function (id, events, lmap) {
    var element = document.getElementById(id);
    var mouseX;
    var mouseOver = false;
    var slide = false;
    var posX,
        clkX;

    var onmouseup = events.onmouseup;
    var onmove = events.onmove;
    var onclick = events.onclick;

    var pointerIndex = -1;

    var message = { "state": 0, "bag": {} };

    function _limit0(left) {
        if (left > parseInt(pointer1.style.left)) {
            return parseInt(pointer1.style.left);
        }
        return left;
    };

    function _limit1(left) {
        if (left < parseInt(pointer0.style.left)) {
            return parseInt(pointer0.style.left);
        }
        return left;
    };

    var limitCallback = null;

    //два слайдера
    var pointer0 = document.createElement("div");
    pointer0.style.display = "none";
    pointer0.classList.add("ntSliderPointer0");
    pointer0.classList.add("ntSliderPointerLight0");
    element.appendChild(pointer0);

    var caption0 = document.createElement("div");
    caption0.style.display = "none";
    caption0.classList.add("ntSliderCaption");
    caption0.classList.add("ntCaptionRight");
    caption0.innerHTML = "";
    element.appendChild(caption0);

    var pointer1 = document.createElement("div");
    pointer1.style.display = "none";
    pointer1.classList.add("ntSliderPointer1");
    pointer1.classList.add("ntSliderPointerLight1");
    element.appendChild(pointer1);

    var caption1 = document.createElement("div");
    caption1.style.display = "none";
    caption1.classList.add("ntSliderCaption");
    caption1.classList.add("ntCaptionRight");
    caption1.innerHTML = "";
    element.appendChild(caption1);

    //один слайдер
    var pointer = document.createElement("div");
    pointer.classList.add("ntSliderPointer");
    pointer.classList.add("ntSliderPointerLight");
    element.appendChild(pointer);

    var caption = document.createElement("div");
    caption.classList.add("ntSliderCaption");
    caption.classList.add("ntCaptionRight");
    caption.innerHTML = "";
    element.appendChild(caption);

    var selectedCaption = caption,
        selectedPointer = pointer;


    this.getContainer = function () {
        return element;
    };

    this.getState = function () {
        return message;
    };

    this.getCaption = function () {
        return caption.innerHTML;
    };

    this.getCaption0 = function () {
        return caption0.innerHTML;
    };

    this.getCaption1 = function () {
        return caption1.innerHTML;
    };

    this.getOffsetLeft = function (index) {
        if (index == undefined || index == -1) {
            return pointer.offsetLeft - parseInt($(pointer).css("margin-left"));
        }
        if (index == 0) {
            return pointer0.offsetLeft - parseInt($(pointer0).css("margin-left"));
        }
        if (index == 1) {
            return pointer1.offsetLeft - parseInt($(pointer1).css("margin-left"));
        }
    };

    this.updatePositions = function (ratio) {
        pointer.style.left = (parseFloat(pointer.style.left) * ratio) + "px";
        pointer0.style.left = (parseFloat(pointer0.style.left) * ratio) + "px";
        pointer1.style.left = (parseFloat(pointer1.style.left) * ratio) + "px";

        caption.style.left = (parseFloat(caption.style.left) * ratio) + "px";
        caption0.style.left = (parseFloat(caption0.style.left) * ratio) + "px";
        caption1.style.left = (parseFloat(caption1.style.left) * ratio) + "px";
    };

    this.getOffsetLeft0 = function () {
        return pointer0.offsetLeft - parseInt($(pointer0).css("margin-left"));
    };

    this.getOffsetLeft1 = function () {
        return pointer1.offsetLeft - parseInt($(pointer1).css("margin-left"));
    };

    this.setCaption = function (text) {
        caption.innerHTML = text;
    };

    this.setCaption0 = function (text) {
        caption0.innerHTML = text;
    };

    this.setCaption1 = function (text) {
        caption1.innerHTML = text;
    };

    var that = this;

    //планшет
    pointer.ontouchstart = function (e) {
        pointerIndex = -1;
        selectedPointer = pointer;
        selectedCaption = caption;
        limitCallback = null;
        lmap.dragging.disable();
        e.preventDefault();
        posX = e.changedTouches[0].pageX;
        onMouseDown();
    };

    pointer0.ontouchstart = function (e) {
        pointerIndex = 0;
        selectedPointer = pointer0;
        selectedCaption = caption0;
        limitCallback = _limit0;
        lmap.dragging.disable();
        e.preventDefault();
        posX = e.changedTouches[0].pageX;
        onMouseDown();
    };

    pointer1.ontouchstart = function (e) {
        pointerIndex = 1;
        selectedPointer = pointer1;
        selectedCaption = caption1;
        limitCallback = _limit1;
        lmap.dragging.disable();
        e.preventDefault();
        posX = e.changedTouches[0].pageX;
        onMouseDown();
    };

    //мышь0
    pointer0.onmousedown = function (e) {
        pointerIndex = 0;
        selectedPointer = pointer0;
        selectedCaption = caption0;
        limitCallback = _limit0;
        onMouseDown();
    };

    pointer0.onmouseup = function (e) {
        onMouseUp();
    };

    pointer0.onmouseover = function () {
        mouseOver = true;
    };

    pointer0.onmouseleave = function () {
        mouseOver = false;
    };

    //мышь1
    pointer1.onmousedown = function (e) {
        pointerIndex = 1;
        selectedPointer = pointer1;
        selectedCaption = caption1;
        limitCallback = _limit1;
        onMouseDown();
    };

    pointer1.onmouseup = function (e) {
        onMouseUp();
    };

    pointer1.onmouseover = function () {
        mouseOver = true;
    };

    pointer1.onmouseleave = function () {
        mouseOver = false;
    };

    //мышь
    pointer.onmousedown = function (e) {
        pointerIndex = -1;
        selectedPointer = pointer;
        selectedCaption = caption;
        limitCallback = null;
        onMouseDown();
    };

    pointer.onmouseup = function (e) {
        onMouseUp();
    };

    pointer.onmouseover = function () {
        mouseOver = true;
    };

    pointer.onmouseleave = function () {
        mouseOver = false;
    };

    this.setPeriodSelector = function (period) {
        if (period) {
            selectedPointer = pointer0;
            caption.style.display = "none";
            pointer.style.display = "none";
            caption0.style.display = "block";
            caption1.style.display = "block";
            pointer0.style.display = "block";
            pointer1.style.display = "block";
            pointer0.style.left = pointer.style.left;
            pointer1.style.left = pointer.style.left;
            caption0.style.left = caption.style.left;
            caption1.style.left = caption.style.left;
            caption0.innerHTML = caption.innerHTML;
            caption1.innerHTML = caption.innerHTML;
        } else {
            selectedPointer = pointer;
            selectedCaption = caption;
            caption.style.display = "block";
            caption.style.left = caption0.style.left;
            pointer.style.display = "block";
            pointer.style.left = pointer0.style.left;
            pointer0.style.display = "none";
            pointer1.style.display = "none";
            caption0.style.display = "none";
            caption1.style.display = "none";
            caption0.style.left = caption.style.left;
            caption1.style.left = caption.style.left;
            caption0.innerHTML = caption.innerHTML;
            caption1.innerHTML = caption.innerHTML;
            limitCallback = null;
        }
    };

    this.setActivePointer = function (index) {
        if (index == 0) {
            limitCallback = _limit0;
            selectedPointer = pointer0;
            selectedCaption = caption0;
        } else if (index == 1) {
            limitCallback = _limit1;
            selectedPointer = pointer1;
            selectedCaption = caption1;
        } else {
            limitCallback = null;
            selectedPointer = pointer;
            selectedCaption = caption;
        }
    };

    this.setValue = function (left, text) {

        if (limitCallback) {
            left = limitCallback(left);
        }

        if (left < 0) {
            left = 0;
        } else if (left > element.clientWidth) {
            left = element.clientWidth;
        }

        if (left >= element.clientWidth - 70) {
            if (selectedCaption.classList.contains("ntCaptionRight")) {
                selectedCaption.classList.add("ntCaptionLeft");
                selectedCaption.classList.remove("ntCaptionRight");
            }
        } else if (selectedCaption.classList.contains("ntCaptionLeft")) {
            selectedCaption.classList.add("ntCaptionRight");
            selectedCaption.classList.remove("ntCaptionLeft");
        }

        selectedPointer.style.left = left + "px";
        selectedCaption.style.left = left + "px";

        if (text) {
            selectedCaption.innerHTML = text;
        }
    };

    function onMouseMove() {
        if (slide) {
            var left = posX - clkX;
            if (onmove && parseInt(message.state) != left) {
                that.setValue(left);
                message.state = left;
                message.pointerIndex = pointerIndex;
                onmove.call(that, message, selectedCaption);
            }
        }
    };

    function onMouseUp() {
        if (slide) {
            document.onselectstart = function () { return true; };
            if (slide && onmouseup) {
                message.state = parseInt(selectedPointer.style.left);
                message.pointerIndex = pointerIndex;
                onmouseup.call(that, message);
            }
            slide = false;
        }
    };

    function onMouseDown() {
        document.onselectstart = function () { return false; };
        var currX = 0;
        if (selectedPointer.style.left.length > 0) {
            currX = parseInt(selectedPointer.style.left);
        }
        clkX = posX - currX;
        if (!slide) {
            if (onclick) {
                message.state = parseInt(selectedPointer.style.left || 0);
                message.pointerIndex = pointerIndex;
                onclick.call(that, message);
            }
        }
        slide = true;
    };

    //планшет
    document.addEventListener('touchmove', function (e) {
        if (slide) {
            e.preventDefault();
        }
        posX = e.changedTouches[0].pageX;
        onMouseMove();
    }, false);

    document.addEventListener("touchend", function (e) {
        if (slide) {
            lmap.dragging.enable();
            e.preventDefault();
        }
        onMouseUp();
    }, false);

    //мышка
    $(document.body).on("mousemove", function (e) {
        posX = e.screenX;
        onMouseMove();
    });

    $(document.body).on("mouseup", function (e) {
        onMouseUp();
    });
};