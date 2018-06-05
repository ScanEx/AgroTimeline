var NdviSlider = function (container, containerWidth, range, properties) {
    range = range || [0.0, 1.0];

    this.properties = properties || {};

    this.events = new Events(["mouseup", "move", "click"]);

    var mouseOver = false;
    var slide = false;
    var posX,
        clkX;
    var selectedPointer = null;
    var that = this;

    this.on = function (eventName, callback, sender) {
        this.events.on(eventName, sender || this, callback);
    };

    var _bindEvents = function (_p) {
        _p.onmousedown = function (e) {
            selectedPointer = _p;
            _onMouseDown();
        };

        _p.onmouseup = function (e) {
            _onMouseUp();
        };

        _p.onmouseover = function () {
            mouseOver = true;
        };

        _p.onmouseleave = function () {
            mouseOver = false;
        };
    };

    _getWidth = function () {
        return containerWidth || container.clientWidth;
    };

    //два слайдера
    var _p0 = document.createElement("div");
    _p0.classList.add("alpSlider");
    _p0.style.left = (range[0] * _getWidth()) + "px";
    container.appendChild(_p0);
    _bindEvents(_p0);

    //показатель первого  бегунка
    var _valP0 = document.createElement("div");
    _valP0.classList.add("alpSliderValue");
    _p0.classList.add("alpRight");
    _valP0.innerHTML = "0%";

    //второй бегунок
    var _p1 = document.createElement("div");
    _p1.classList.add("alpSlider");
    _p1.style.left = (range[1] * _getWidth()) + "px";
    container.appendChild(_p1);
    _bindEvents(_p1);

    //показатель второго бегунка
    var _valP1 = document.createElement("div");
    _valP1.classList.add("alpSliderValue");
    _p1.classList.add("alpLeft");
    _valP1.innerHTML = "100%";

    _p0.appendChild(_valP0);
    _p1.appendChild(_valP1);

    this.setRange = function (min, max) {
        range[0] = min;
        range[1] = max;
        _p0.style.left = (min * _getWidth()) + "px";
        _p1.style.left = (max * _getWidth()) + "px";
        _refreshValues();
    };

    this.getPixelRange = function () {
        var min = parseInt(_p0.style.left),
            max = parseInt(_p1.style.left);
        if (min > max) {
            temp = min;
            min = max;
            max = temp;
        }
        return [min, max];
    };

    this.getRange = function () {
        return [range[0], range[1]];
    };

    this.setValues = function (v0, v1) {
        _p0.querySelector(".alpSliderValue").innerHTML = v0 + "%";
        _p1.querySelector(".alpSliderValue").innerHTML = v1 + "%";
    };

    var _setValue = function (left) {
        if (slide) {
            if (left < 0) {
                left = 0;
            } else if (left > _getWidth()) {
                left = _getWidth();
            }

            selectedPointer.style.left = left + "px";

            var min = parseInt(_p0.style.left) / _getWidth(),
                max = parseInt(_p1.style.left) / _getWidth(),
                temp = min;

            if (min > max) {
                var temp = _p0;
                _p0 = _p1;
                _p1 = temp;

                temp = min;
                min = max;
                max = temp;
            }

            _refreshValues();

            range[0] = min;
            range[1] = max;
        }
    };

    function _refreshValues() {
        if (Math.abs(range[1] - range[0]) < 0.1) {
            _p0.classList.remove("alpRight");
            _p0.classList.add("alpLeft");
            _p1.classList.remove("alpLeft");
            _p1.classList.add("alpRight");
        } else {

            if (range[0] < 0.02) {
                _p0.classList.remove("alpLeft");
                _p0.classList.add("alpRight");
            } else {
                _p0.classList.remove("alpRight");
                _p0.classList.add("alpLeft");
            }

            if (range[1] > 0.98) {
                _p1.classList.remove("alpRight");
                _p1.classList.add("alpLeft");
            } else {
                _p1.classList.remove("alpLeft");
                _p1.classList.add("alpRight");
            }
        }
    };

    function _onMouseMove() {
        if (slide) {
            var left = posX - clkX;
            _setValue(left);
            that.events.dispatch(that.events.move, {
                'range': [range[0], range[1]]
            });
        }
    };

    function _onMouseUp() {
        if (slide) {
            document.onselectstart = function () { return true; };
            if (slide) {
                that.events.dispatch(that.events.mouseup, {
                    'range': [range[0], range[1]]
                });
            }
            slide = false;
        }
    };

    function _onMouseDown() {
        document.onselectstart = function () { return false; };
        var currX = 0;
        if (selectedPointer.style.left.length > 0) {
            currX = parseInt(selectedPointer.style.left);
        }
        clkX = posX - currX;
        if (!slide) {
            that.events.dispatch(that.events.click, {
                'range': [range[0], range[1]]
            });
        }
        slide = true;
    };

    //планшет
    document.addEventListener('touchmove', function (e) {
        if (slide) {
            e.preventDefault();
        }
        posX = e.changedTouches[0].pageX;
        _onMouseMove();
    }, false);

    document.addEventListener("touchend", function (e) {
        if (slide) {
            e.preventDefault();
        }
        _onMouseUp();
    }, false);

    //мышка
    $(document.body).on("mousemove", function (e) {
        posX = e.screenX;
        _onMouseMove();
    });

    $(document.body).on("mouseup", function (e) {
        _onMouseUp();
    });
};