var LegendDialog = function (options) {
    options = options || {};
    this.el = null;
    this.$el = null;
    this.$content = null;
    this._width = options.width || 510;
    this._height = options.height || 105;
    this._caption = options.caption || "";
    this.__dialogClass = "dlgLegendDialog";

    this.onclose = null;

    this._create();
};

LegendDialog.prototype.setVisibility = function (visibility) {
    if (visibility)
        this.show();
    else
        this.hide();
};

LegendDialog.prototype.getVisibility = function () {
    return $("." + this.__dialogClass)[0].style.display != "none";
}

LegendDialog.prototype.show = function () {
    $("." + this.__dialogClass).show();
    this.$el.dialog();
};

LegendDialog.prototype.hide = function () {
    $("." + this.__dialogClass).hide();
};

LegendDialog.prototype.changeVisibility = function () {
    if (this.getVisibility()) {
        this.hide();
    } else {
        this.show();
    }
};

LegendDialog.prototype.setPosition = function (x, y) {
    this.$el.parent().css('left', x);
    this.$el.parent().css('top', y);
    this.$el.dialog('option', 'position', [x, y]);
};

LegendDialog.prototype.getLeft = function () {
    return $(this.el.parentElement).position().left;
};

LegendDialog.prototype.getTop = function () {
    return $(this.el.parentElement).position().top;
};

LegendDialog.prototype.getWidth = function () {
    return this._width;
};

LegendDialog.prototype.getHeight = function () {
    return this._height;
};

LegendDialog.prototype.setWidth = function (w) {
    var x = this.getLeft(),
        y = this.getTop();
    this._width = w;
    this.$el.dialog('option', 'width', w);
    this.setPosition(x, y);
};

LegendDialog.prototype.setHeight = function (h) {
    var x = this.getLeft(),
        y = this.getTop();
    this._height = h;
    this.$el.dialog('option', 'height', h);
    this.setPosition(x, y);
};

LegendDialog.prototype.setSize = function (w, h) {
    var x = this.getLeft(),
        y = this.getTop();
    this._width = w;
    this._height = h;
    this.$el.dialog('option', 'width', w);
    this.$el.dialog('option', 'height', h);
    this.setPosition(x, y);
};

LegendDialog.prototype.setPositionRight = function (x, y) {
    this.$el.parent().css('left', document.documentElement.clientWidth - this.getWidth() - x);
    this.$el.parent().css('top', y);
    this.$el.dialog('option', 'position', [document.documentElement.clientWidth - this.getWidth() - x, y]);
};

LegendDialog.prototype.setPositionRightBottom = function (x, y) {
    this.$el.parent().css('left', document.documentElement.clientWidth - this.getWidth() - x);
    this.$el.parent().css('top', document.documentElement.clientHeight - this.getHeight() - y);
    this.$el.dialog('option', 'position', [document.documentElement.clientWidth - this.getWidth() - x,
        document.documentElement.clientHeight - this.getHeight() - y]);
};

LegendDialog.prototype.showDescription = function () {
    alert("description");
};

LegendDialog.prototype._createTitlebarButtons = function () {
    $titlebar = $("." + this.__dialogClass + " .ui-dialog-titlebar")

    var that = this;
    this.iconButtons = {
        "close": {
            icon: "ui-icon-closethick",
            click: function (e) {
                that.onclose && that.onclose();
                that.hide();
            }
        }
    };

    $.each(this.iconButtons, function (i, v) {

        var $button = $("<button/>").text(this.text),
            right = $titlebar.find("[role='button']:last")
                                .css("right");

        $button.button({ icons: { primary: this.icon }, text: false })
                .addClass("ui-dialog-titlebar-close")
                .css("right", (parseInt(right) + 22) + "px")
                .click(this.click)
                .appendTo($titlebar);

        this.buttonElement = $button[0];
    });
};

LegendDialog.prototype.setCaption = function (str) {
    $("." + this.__dialogClass + " .ui-dialog-titlebar .ui-dialog-title").text(str);
};

LegendDialog.prototype._create = function () {

    this.$content = $("<div></div>");

    $(this.$content.get(0)).empty();

    var that = this;

    this.el = showDialog("", this.$content.get(0), 0, 0, false, false, null,
        function () {
            that.closeDialog && that.closeDialog();
        });

    this.el.style.display = "block";

    this.$el = $(this.el);

    this.$el.dialog({
        'dialogClass': this.__dialogClass,
        'draggable': false,
        'resizable': false
    });
    this.hide();
    $("." + this.__dialogClass + " .ui-dialog-titlebar-close").remove();
    this._createTitlebarButtons();

    $("." + this.__dialogClass + " .ui-dialog-titlebar").css("padding", "10px 0px 9px 24px");
    $("." + this.__dialogClass + " .ui-dialog-titlebar .ui-dialog-title").append(this._caption);
    $("." + this.__dialogClass + " .ui-dialog").css({ "float": "none", "font-size": "12px", "font-family": "Tahoma", "background-color": "#FFFFFF", "border-color": "#e7e7e7" });

    this.$el.dialog('option', 'zIndex', 20001);
    this.$el.dialog('option', 'height', this._height);
    this.$el.dialog('option', 'width', this._width);
    this.$el.dialog('moveToTop');

    this.$content.parent().css('padding', "0px");
    this.$content.parent().css('margin', "0px 8px 8px 8px");
    this.$content.parent().css('overflow', "hidden");

    this.$el.parent().position({
        my: "center",
        at: "center",
        of: window
    });

    L.DomEvent.disableClickPropagation(this.$el.parent().get(0));
    L.DomEvent.disableScrollPropagation(this.$el.parent().get(0));
};