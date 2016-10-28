/**
 params = {
  items:[{"type":"checkbox", 
 	"id"="chkQl", 
	"text":"Hello world", 
	"click":function(e){ console.log("Hello world"); }}]
 }
*/

var OptionsMenu = function (elementId, params) {

    var button = document.createElement("div");
    button.classList.add("ntBtnOptions");
    button.title = "Дополнительные настройки";
    button.tabIndex = "100";
    document.getElementById(elementId).appendChild(button);

    var _optionsMenu = document.createElement("div");
    _optionsMenu.classList.add("ntOptionsMenu");
    _optionsMenu.style.display = "none";
    _optionsMenu.innerHTML =
        '<div id="ntOptionsArrowDiv" class="ntOptionsArrowDiv">\
          <div id="ntOptionsHead">\
            <div id="ntOptionsHeadLabel">Дополнительные параметры</div>\
            <div id="ntOptionsCloseBtn">×</div>\
          </div>\
        <div>';
    document.body.appendChild(_optionsMenu);

    var that = this;

    document.getElementById("ntOptionsCloseBtn").onclick = function () {
        that.hide();
    };

    params = params || {};
    this.items = [];

    this.getMenuContainer = function () {
        return _optionsMenu;
    };

    this.show = function () {
        _optionsMenu.style.display = "block";
        that._isOpened = true;
        that._dontClose = true;
        setTimeout(function () {
            that._dontClose = false;
        }, 100);
    };

    this.hide = function () {
        that._isOpened = false;
        that._dontClose = false;
        _optionsMenu.style.display = "none";
    };

    this._dontClose = false;

    _optionsMenu.onmouseover = function () {
        this._dontClose = true;
    };

    this._isOpened = false;

    function focusOut() {
        setTimeout(function () {
            if (!that._dontClose) {
                that._isOpened = false;
                _optionsMenu.style.display = "none";
            }
        }, 100);
    };

    button.onclick = function () {
        if (that._isOpened) {
            that.hide();
        } else {
            that.show();
        }
    };

    this.getButtonElement = function () {
        return button;
    };

    this.getMenuElement = function () {
        return document.getElementById("ntOptionsArrowDiv");
    };

    if (params.items) {
        for (var i = 0; i < params.items.length; i++) {
            this.addItem(params.items[i]);
        }
    }
};

OptionsMenu.prototype.addItem = function (item) {
    this.items.push(item);
    var menu = this.getMenuElement();

    var itemDiv = document.createElement("div");
    itemDiv.classList.add("ntOptionsMenuItemLine");
    item.lineId && (itemDiv.id = item.lineId);

    item.class && $(itemDiv).addClass(item.class);

    if (item.type == "checkbox") {
        var id = (item.id || "nt-menu-item_" + (this.items.length - 1));
        itemDiv.innerHTML = '<div class="ntOptionsMenuInput"> \
                              <input style="cursor:pointer" type="checkbox" id="' + id + '"></input> \
                            </div> \
                            <div class="ntOptionsMenuLabel" title="' + item.text + '">' + item.text + '</div>';
        menu.appendChild(itemDiv);
        var inp = document.getElementById(id);
        inp.onchange = function (e) {
            item.click(this);
        };
    }
};
