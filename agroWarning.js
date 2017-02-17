var SWarningDialog = function () {
    this.dialog = null;
    this.dialogContent = null;
    this.__dialogClass = "dlgAgroWarning";
    this._createDialog("Предупреждение", 680, 100);
};

SWarningDialog.prototype.setPosition = function (x, y) {
    $(this.dialog).dialog('option', 'position', [x, y]);
};

SWarningDialog.prototype.show = function () {
    $("." + this.__dialogClass).show();
    $(this.dialog).dialog();
};

SWarningDialog.prototype.hide = function () {
    $("." + this.__dialogClass).hide();
};

SWarningDialog.prototype.closeDialog = function () {
    //...
};

SWarningDialog.prototype._createDialog = function (caption, width, height) {
    if (this.dialog)
        return;

    this.dialogContent = $("<div></div>");

    $(this.dialogContent.get(0)).empty();

    var that = this;

    this.dialog = showDialog("", this.dialogContent.get(0), 0, 0, false, false, null,
        function () {
            that.closeDialog();
        });

    this.dialog.style.display = "block";

    $(this.dialog).dialog({ dialogClass: this.__dialogClass });
    $("." + this.__dialogClass + " .ui-dialog-titlebar .ui-dialog-title").append(caption);
    $("." + this.__dialogClass + " .ui-dialog").css({ "float": "none", "font-size": "12px", "font-family": "Tahoma", "background-color": "#FFFFFF", "border-color": "#e7e7e7" });
    $(this.dialog).dialog('option', 'zIndex', 20001);
    $(this.dialog).dialog('option', 'height', height || 139);
    $(this.dialog).dialog('option', 'width', width || 256);
    $(this.dialog).dialog('moveToTop');
};

SWarningDialog.prototype.appendHTML = function (html) {
    $(this.dialogContent.get(0)).empty();
    $(this.dialogContent.get(0)).append(html);
};

var AgroWarning = (function () {
    var instance;

    function createInstance() {
        var object = new SWarningDialog();
        return object;
    }

    return {
        getInstance: function () {
            if (!instance) {
                instance = createInstance();
            }
            return instance;
        }
    };
})();