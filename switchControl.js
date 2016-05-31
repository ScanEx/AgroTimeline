var SwitchControl = function (params) {
    this._element = null;

    this._onshow = params && params.onshow;
    this._onhide = params && params.onhide;
    this._parentId = params && params.parentId;

    this._isCollapsed = false;

    this.initialize();
};

SwitchControl.prototype.show = function (manually) {
    if (this._isCollapsed) {
        this._isCollapsed = false;
        this._onshow && this._onshow(manually);
        this._element.classList.remove("switcherButtonMaximize");
        this._element.classList.add("switcherButtonMinimize");
    }
};

SwitchControl.prototype.hide = function (manually) {
    if (!this._isCollapsed) {
        this._isCollapsed = true;
        this._onhide && this._onhide(manually);
        this._element.classList.remove("switcherButtonMinimize");
        this._element.classList.add("switcherButtonMaximize");
    }
};

SwitchControl.prototype.switch = function (manually) {
    if (this._isCollapsed) {
        this.show(manually);
    } else {
        this.hide(manually);
    }
};

SwitchControl.prototype.initialize = function () {
    this._element = document.createElement('div');

    if (this._parentId) {
        this.appendTo(document.getElementById(this._parentId));
    }

    this._element.classList.add("switcherControl");
    this._element.classList.add("switcherButtonMinimize");

    var that = this;
    this._element.onclick = function (e) {
        e.stopPropagation();
        that.switch(true);
    };

    this._element.ondblclick = function (e) {
        e.stopPropagation();
    };
    this._element.ontouchstart = function (e) {
        e.preventDefault();
        e.stopPropagation();
        that.switch(true);
    };
};

SwitchControl.prototype.appendTo = function (parent) {
    parent.appendChild(this._element);
};

SwitchControl.prototype.setStyle = function (attr, value) {
    this._element.style[attr] = value;
};

SwitchControl.prototype.onShow = function (callback) {
    this._onshow = callback;
};

SwitchControl.prototype.onHide = function (callback) {
    this._onhide = callback;
};

SwitchControl.prototype.isCollapsed = function () {
    return this._isCollapsed;
};