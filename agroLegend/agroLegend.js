var AgroLegend = function (options) {
    options = options || {};
    this._legendHash = options.legend ? AgroLegend._compile[options.legendType](options.legend) : {};
    this._continuousTable = options.continuousTable;
    this.dialog = null;
    this.dialogContent = null;
    this._sort = options.sort;
    this._horizontal = options.horizontal;
    this.description = options.description || null;
    this.descriptionWidth = options.descriptionWidth || 640;
    this.descriptionHeight = options.descriptionHeight || 480;
    //это не тот description что выше, совсем другой.
    this._descriptionCallback = options.descriptionCallback;
    this.__dialogClass = "dlgLegend_" + AgroLegend.__dialogCounter++;
    this._createDialog(options.caption, options.width, options.height);
    this._sortField = options.sortField;
    if (!$.isEmptyObject(this._legendHash)) {
        this._createTable();
    }
    this._colorWidth = options.colorWidth;
    this.bottomHtml = options.bottomHtml || "";
    this._useDescription = options.useDescription != undefined ? options.useDescription : true;
    this.alternateDescriptionHTML = options.alternateDescriptionHTML || "";
};

AgroLegend.__dialogCounter = 0

AgroLegend.RGBToString = function (r, g, b) {
    var d = r + 256 * g + 65536 * b;
    return d.toString(16);
};

AgroLegend.toHex = function (c) {
    var hex = c.toString(16);
    return hex.length == 1 ? "0" + hex : hex;
};

AgroLegend.RGBToHex = function (r, g, b) {
    return "#" + AgroLegend.toHex(r) + AgroLegend.toHex(g) + AgroLegend.toHex(b);
};

AgroLegend.prototype.loadLegend = function (url, legendType) {
    var that = this;
    shared.loadPaletteSync(url).then(function (pal) {
        that.applyLegend(pal, legendType);
    });
};

AgroLegend.prototype.applyLegend = function (palette, legendType) {
    this.clear();
    this._legendHash = AgroLegend._compile[legendType](palette, this._descriptionCallback);
    this._createTable();
};

AgroLegend.prototype.clear = function () {
    this._legendHash = {};
    $(this.dialogContent.get(0)).empty();
};

AgroLegend.compileClassificationLegend = function (legend, callback) {
    var res = {};

    var i = legend.length;
    while (i--) {
        var li = legend[i];
        if (callback)
            li.description = callback(li.description);
        res[AgroLegend.RGBToString(li.r, li.g, li.b)] = li;
    }

    return res;
};

AgroLegend.compileNDVILegend = function (pal, callback) {
    var res = {};

    var r, g, b, code, counter = 0;
    for (var i = 0; i < pal.length; i++) {
        var pi = pal[i];
        if (pi) {
            r = pi.partRed;
            g = pi.partGreen;
            b = pi.partBlue;
            code = i - 97;
            res[AgroLegend.RGBToString(r, g, b)] = { "class": counter++, "r": r, "g": g, "b": b, "description": (callback ? callback(code) : code) };
        }
    }

    return res;
};

AgroLegend.NDVI = 0;
AgroLegend.AGRO = 1;

AgroLegend._compile = [];
AgroLegend._compile[AgroLegend.NDVI] = AgroLegend.compileNDVILegend;
AgroLegend._compile[AgroLegend.AGRO] = AgroLegend.compileClassificationLegend;

AgroLegend._dataType = [];
AgroLegend._dataType[AgroLegend.NDVI] = "xml";
AgroLegend._dataType[AgroLegend.AGRO] = "json";

AgroLegend.prototype.getLegendByRGB = function (r, g, b) {
    return this._legendHash[AgroLegend.RGBToString(r, g, b)];
};

AgroLegend.prototype.setVisibility = function (visibility) {
    if (visibility)
        this.show();
    else
        this.hide();
};

AgroLegend.prototype.getVisibility = function () {
    return $("." + this.__dialogClass)[0].style.display != "none";
}

AgroLegend.prototype.show = function () {
    $("." + this.__dialogClass).show();
    $(this.dialog).dialog();
};

AgroLegend.prototype.hide = function () {
    $("." + this.__dialogClass).hide();
};

AgroLegend.prototype.changeVisibility = function () {
    if (this.getVisibility()) {
        this.hide();
    } else {
        this.show();
    }
};

AgroLegend.prototype.setPosition = function (x, y) {
    $(this.dialog).dialog('option', 'position', [x, y]);
};

AgroLegend.prototype.getLeft = function () {
    return $(this.dialog.parentElement).position().left;
};

AgroLegend.prototype.getTop = function () {
    return $(this.dialog.parentElement).position().top;
};

AgroLegend.prototype.setPositionRight = function (x, y) {
    $(this.dialog).dialog('option', 'position', [screen.width - x, y]);
};

AgroLegend.prototype.showDescription = function () {
    alert("description");
};

AgroLegend.prototype._createTitlebarButtons = function () {
    $titlebar = $("." + this.__dialogClass + " .ui-dialog-titlebar")

    var that = this;
    this.iconButtons = {
        "close": {
            //text: "Закрыть",
            icon: "ui-icon-closethick",
            click: function (e) {
                that.hide();
            }
        }
    };

    //if (this.description) {
    //    this.iconButtons["_description"] = {
    //        //text: "Описание",
    //        icon: "ui-icon-helpthick",
    //        click: function (e) {
    //            that.showDescriptionDialog(that.description, that.descriptionWidth, that.descriptionHeight);
    //        }
    //    }
    //}

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

AgroLegend.prototype.setCaption = function (str) {
    $("." + this.__dialogClass + " .ui-dialog-titlebar .ui-dialog-title").text(str);
};

AgroLegend.prototype.showDescriptionDialog = function (description, width, height) {

    var descriptionContent = $("<div>" + description + "</div>");

    var that = this;

    var dialog = showDialog("", descriptionContent.get(0), 0, 0, false, false, null);

    dialog.style.display = "block";

    $(dialog).dialog({ dialogClass: this.__dialogClass + "_description" });

    $("." + this.__dialogClass + "_description" + " .ui-dialog-titlebar .ui-dialog-title").append("Описание");
    $("." + this.__dialogClass + "_description" + " .ui-dialog").css({ "float": "none", "font-size": "12px", "font-family": "Tahoma", "background-color": "#FFFFFF", "border-color": "#e7e7e7" });
    $(dialog).dialog('option', 'zIndex', 20002);
    $(dialog).dialog('option', 'height', height || 480);
    $(dialog).dialog('option', 'width', width || 640);
    $(dialog).dialog('moveToTop');
};


AgroLegend.prototype._createDialog = function (caption, width, height) {
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
    this.hide();
    $("." + this.__dialogClass + " .ui-dialog-titlebar-close").remove();
    this._createTitlebarButtons();

    $("." + this.__dialogClass + " .ui-dialog-titlebar").css("padding", "10px 0px 9px 24px");

    $("." + this.__dialogClass + " .ui-dialog-titlebar .ui-dialog-title").append(caption);
    $("." + this.__dialogClass + " .ui-dialog").css({ "float": "none", "font-size": "12px", "font-family": "Tahoma", "background-color": "#FFFFFF", "border-color": "#e7e7e7" });
    $(this.dialog).dialog('option', 'zIndex', 20001);
    $(this.dialog).dialog('option', 'height', height || 139);
    $(this.dialog).dialog('option', 'width', width || 256);
    $(this.dialog).dialog('moveToTop');

    this.dialogContent.parent().css('padding', "0px");
    this.dialogContent.parent().css('margin', "0px 8px 8px 8px");
    this.dialogContent.parent().css('overflow', "hidden");

    $(this.dialog).parent().position({
        my: "center",
        at: "center",
        of: window
    });

    L.DomEvent.disableClickPropagation($(this.dialog).parent().get(0));
    L.DomEvent.disableScrollPropagation($(this.dialog).parent().get(0));
};

AgroLegend.prototype._createTable = function () {

    var rows = "";
    var lblRows = "";
    var that = this;
    if (this._horizontal) {
        function _td(p, style, i) {
            if (i == 0) {
                return '<td></td><td>0</td>';
            } else {
                var d = "";
                if (((i + 1) % 10) == 0) {
                    d = (Math.round(10 * i / 101) / 10).toString();
                }
                return '<td ' /*+ (((i + 5) % 10) ? "" : "colspan=10")*/ + '><div class="legendLabelh" style=" width:' + (that._colorWidth ? (that._colorWidth + 'px !important') : '"') + '>' + d/*(((i + 5) % 10) ? "" : p)*/ + '</div></td>';
            }
        };
        function _tdc(p, style, i) {
            if (i == 0) {
                return '<td><div class="legendColorh" style="background-color:' + p + style + '"></div></td>';// +
                //'<td><div class="legendColorh" style="background-color:' + p + style + '"></div></td>';
            } else {
                return '<td><div class="legendColorh" style="background-color:' + p + style + '"></div></td>';
            }
        };
        var st = this._continuousTable ? "; margin-left: 0; margin-right: 0;" : "";

        if (this._colorWidth) {
            st += "width:" + this._colorWidth + "px;";
        }

        if (!this._sort) {
            //
            // TODO
            //
        } else {
            var sortable = [];
            for (var i in this._legendHash) {
                sortable.push(this._legendHash[i]);
            }
            var sortField = this._sortField;
            sortable.sort(function (a, b) { return a[sortField] - b[sortField]; });
            //description line
            var row1 = "";
            if (this._useDescription) {
                for (var i = 0; i < sortable.length; i++) {
                    var li = sortable[i];
                    var r = _td(li.description, st, i);
                    rows += r;
                }
                row1 = '<tr>' + rows + '</tr>';
            }

            rows = "";
            //color line
            for (var i = 0; i < sortable.length; i++) {
                var li = sortable[i];
                var r = _tdc(AgroLegend.RGBToHex(li.r, li.g, li.b), st, i);
                rows += r;
            }
            var row2 = '<tr>' + rows + '</tr>';
        }
        rows = row2;
        lblRows = row1;
    } else {

        function _tr(p1, p2, style) {
            return '<tr><td><div class="legendColor" style="background-color:' + p1 + style + '"></div></td><td>' + p2 + '</td></tr>';
        };
        var st = this._continuousTable ? "; margin-top: 0; margin-bottom: 0" : "";
        rows = "";
        if (!this._sort) {
            for (var i in this._legendHash) {
                var li = this._legendHash[i];
                var r = _tr(AgroLegend.RGBToHex(li.r, li.g, li.b), li.description, st);
                rows += r;
            }
        } else {
            var sortable = [];
            for (var i in this._legendHash) {
                sortable.push(this._legendHash[i]);
            }
            var sortField = this._sortField;
            sortable.sort(function (a, b) { return a[sortField] - b[sortField]; });
            for (var i = 0; i < sortable.length; i++) {
                var li = sortable[i];
                var r = _tr(AgroLegend.RGBToHex(li.r, li.g, li.b), li.description, st);
                rows += r;
            }
        }
    }

    var lblTable = "";
    if (this._useDescription) {
        var lblTable = '<table class="legendTable">' +
               '<tbody>' +
               lblRows +
               '</tbody>' +
               '</table>'
    } else {
        lblTable = this.alternateDescriptionHTML;
    }

    var html = lblTable + '<table class="legendTable">' +
           '<tbody>' +
           rows +
           '</tbody>' +
           '</table>';

    $(this.dialogContent.get(0)).empty();
    $(this.dialogContent.get(0)).append(html + this.bottomHtml);
};

AgroLegend.start = function () {

    //Легенда для NDVI_HR
    if (!AgroLegend.legendNdvi) {
        AgroLegend.legendNdvi = new AgroLegend({
            "caption": "NDVI", "width": 429, "height": 141, "continuousTable": true,
            "descriptionCallback": function (d) {
                return parseFloat(((parseInt(d) - 1) / 100).toFixed(2));
            },
            "sort": true,
            "horizontal": true,
            "sortField": "description",
            "bottomHtml": '<div style="margin-top:10px;"><div style="margin-right: 5px;background-color:rgb(0,179,255);float:left; width:15px;height:25px"></div><div style="float:left;margin-top: 5px;"> - облака и тени</div></div>'
        });

        AgroLegend.legendNdvi.loadLegend('http://maps.kosmosnimki.ru/api/plugins/palettes/NDVI_interp_legend.icxleg.xml', AgroLegend.NDVI);
        AgroLegend.legendNdvi.setPosition(screen.width * 0.5 - 90, 110);
    }

    //Легенда для QUALITY
    if (!AgroLegend.legendQuality) {
        AgroLegend.legendQuality = new AgroLegend({
            "caption": "Оценка качества композита NDVI", "width": 281, "height": 156,
            "sortField": "class",
            "sort": true
        });

        var qualityLegend = [
            { "class": 5, "r": 0, g: 255, b: 255, "description": 'облака' },
            { "class": 4, "r": 128, g: 0, b: 255, "description": 'снег/лед' },
            { "class": 3, "r": 255, g: 128, b: 0, "description": 'данные удовлетворительного качества' },
            { "class": 2, "r": 255, g: 255, b: 179, "description": 'данные хорошего качества' },
            { "class": 1, "r": 255, g: 0, b: 0, "description": 'данные отсутствуют' }
        ];
        AgroLegend.legendQuality.applyLegend(qualityLegend, AgroLegend.AGRO);
        AgroLegend.legendQuality.setPosition(screen.width * 0.5 + 50, 110);
    }

    //Легенда для классификации
    if (!AgroLegend.legendClassification) {
        AgroLegend.legendClassification = new AgroLegend({
            "caption": "Состояние полей", "sortField": "class", " width": 276, "height": 192,
            "sort": true
        });

        var classificationLegend = [
            { "class": 1, "r": 0, g: 128, b: 0, "description": 'высокая активность фотосинтеза' },
            { "class": 2, "r": 0, g: 255, b: 0, "description": 'средняя активность фотосинтеза' },
            { "class": 3, "r": 128, g: 255, b: 128, "description": 'низкая активность фотосинтеза' },
            { "class": 4, "r": 255, g: 255, b: 128, "description": 'нераспаханная почва / нет фотосинтеза' },
            { "class": 5, "r": 128, g: 0, b: 0, "description": 'распаханная почва / нет фотосинтеза' },
            { "class": 5, "r": 0, g: 179, b: 255, "description": 'облака и тени' }
        ];
        AgroLegend.legendClassification.applyLegend(classificationLegend, AgroLegend.AGRO);
        AgroLegend.legendClassification.setPosition(screen.width * 0.5 + 50, 110);
    }

    //Легенда для интегрального индекса условия вегетации
    if (!AgroLegend.legendConditionsOfVegetation) {
        AgroLegend.legendConditionsOfVegetation = new AgroLegend({
            "caption": "Индекс условий вегетации", "width": 303, "height": 173,
            "sortField": "class",
            "sort": true
        });

        var conditionsOfVegetationLegend = [

            { "class": 100, "r": 0, g: 0, b: 0, "description": 'нет данных' },
            { "class": 90, "r": 255, g: 0, b: 0, "description": 'существенно хуже среднего многолетнего' },
            { "class": 80, "r": 255, g: 128, b: 128, "description": 'хуже среднего многолетнего' },
            { "class": 60, "r": 255, g: 255, b: 0, "description": 'близко к среднему многолетнему' },
            { "class": 60, "r": 0, g: 255, b: 0, "description": 'лучше среднего многолетнего' },
            { "class": 50, "r": 0, g: 128, b: 0, "description": 'существенно лучше среднего многолетнего' }
        ];
        AgroLegend.legendConditionsOfVegetation.applyLegend(conditionsOfVegetationLegend, AgroLegend.AGRO);
        AgroLegend.legendConditionsOfVegetation.setPosition(screen.width * 0.5 + 20, 110);
    }

    //Легенда для неоднородности
    if (!AgroLegend.legendInhomogenuity) {
        AgroLegend.legendInhomogenuity = new AgroLegend({
            "caption": "Однородность", "width": 168, "height": 100,
            "sortField": "class",
            "sort": true,
            "description": "Однородность",
            "continuousTable": true,
            "horizontal": true,
            "colorWidth": 30,
            "useDescription": false,
            "alternateDescriptionHTML": '<div style="float:left">высокая</div><div style="float:right">низкая</div>'
        });

        var inhomogenuityLegend = [
            { "class": 1, "r": 245, "g": 12, "b": 50, "description": "" },
            { "class": 2, "r": 227, "g": 145, "b": 57, "description": "" },
            { "class": 3, "r": 240, "g": 240, "b": 24, "description": "" },
            { "class": 4, "r": 125, "g": 235, "b": 21, "description": "" },
            { "class": 5, "r": 30, "g": 163, "b": 18, "description": "" }
        ];

        AgroLegend.legendInhomogenuity.applyLegend(inhomogenuityLegend, AgroLegend.AGRO);
        AgroLegend.legendInhomogenuity.setPosition(screen.width * 0.5 + 20, 110);
    }

    //Легенда для неоднородности
    if (!AgroLegend.legendRating) {
        AgroLegend.legendRating = new AgroLegend({
            "caption": "Рейтинг", "width": 233, "height": 100,
            "sortField": "class",
            "sort": true,
            "description": "Рейтинг",
            "continuousTable": true,
            "horizontal": true,
            "colorWidth": 24,
            "useDescription": false,
            "alternateDescriptionHTML": '<div style="float:left">низкий</div><div style="float:right">высокий</div>'
        });

        var ratingLegend = [
            { "class": 0, r: 0, g: 0, b: 0, "description": "" },
            { "class": 3, r: 245, g: 12, b: 50, "description": "" },
            { "class": 4, r: 227, g: 145, b: 57, "description": "" },
            { "class": 5, r: 230, g: 200, b: 78, "description": "" },
            { "class": 6, r: 240, g: 240, b: 24, "description": "" },
            { "class": 7, r: 223, g: 237, b: 92, "description": "" },
            { "class": 8, r: 179, g: 214, b: 109, "description": "" },
            { "class": 9, r: 125, g: 235, b: 21, "description": "" },
            { "class": 10, r: 30, g: 163, b: 18, "description": "Высокий рейтинг" }
        ];

        AgroLegend.legendRating.applyLegend(ratingLegend, AgroLegend.AGRO);
        AgroLegend.legendRating.setPosition(screen.width * 0.5 + 20, 110);
    }

    AgroLegend.toggleLegend = function (legend) {
        var vis = legend.getVisibility();
        AgroLegend.legendNdvi.hide();
        AgroLegend.legendClassification.hide();
        AgroLegend.legendQuality.hide();
        AgroLegend.legendInhomogenuity.hide();
        AgroLegend.legendRating.hide();
        legend.setVisibility(!vis);
    }
};