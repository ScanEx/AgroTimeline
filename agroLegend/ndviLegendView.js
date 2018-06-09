var NDVILegendView = function () {

    var lang = L.gmxLocale.getLanguage();

    if (window.cosmosagro) {
        var _palettes = [{
            'title': NDVILegendView.locale[lang].EstestvennayaShkala,
            'url': "http://maps.kosmosnimki.ru/api/plugins/palettes/EXPERIMENTAL_NDVI_interp_legend.icxleg.xml",
            'min': 0.0,
            'max': 1.0
        }, {
            'title': NDVILegendView.locale[lang].AnaliticheskayaShkala,
            'url': "http://maps.kosmosnimki.ru/api/plugins/palettes/NDVI_BLUE_interp_legend.icxleg.xml",
            'min': 0.0,
            'max': 1.0,
            'isStatic': false
        }, {
            'title': "Экспериментальная шкала MSAVI",
            'tag': "experimental-msavi",
            'url': "http://maps.kosmosnimki.ru/api/plugins/palettes/EXPERIMENTAL_NDVI_MSAVI_interp_legend.icxleg.xml",
            'min': 0.0,
            'max': 1.0,
            'display': "none",
            'isStatic': false
        }];
    } else {
        var _palettes = [{
            'title': NDVILegendView.locale[lang].EstestvennayaShkala,
            'url': "http://maps.kosmosnimki.ru/api/plugins/palettes/NDVI_interp_legend.icxleg.xml",
            'min': 0.0,
            'max': 1.0
        }, {
            'title': NDVILegendView.locale[lang].AnaliticheskayaShkala,
            'url': "http://maps.kosmosnimki.ru/api/plugins/palettes/NDVI_BLUE_interp_legend.icxleg.xml",
            'min': 0.0,
            'max': 1.0,
            'isStatic': false
        }, {
            'title': "Экспериментальная шкала NDVI",
            'tag': "experimental-ndvi",
            'url': "http://maps.kosmosnimki.ru/api/plugins/palettes/EXPERIMENTAL_NDVI_interp_legend.icxleg.xml",
            'min': 0.0,
            'max': 1.0,
            'display': "none",
            'isStatic': false
        }, {
            'title': "Экспериментальная шкала MSAVI",
            'tag': "experimental-msavi",
            'url': "http://maps.kosmosnimki.ru/api/plugins/palettes/EXPERIMENTAL_NDVI_MSAVI_interp_legend.icxleg.xml",
            'min': 0.0,
            'max': 1.0,
            'display': "none",
            'isStatic': false
        }];
    }

    inheritance.base(this, new NDVILegend({
        'name': NDVILegendView.locale[lang].CvetovajaShkalaNdvi,
        'width': 480,
        'height': 235,
        'palettes': _palettes
    }));

    var SLIDER_CONTAINER_SIZE = 404;

    this._requestID = 0;

    this.sliders = [];

    var _lerp = function (t, h1, h0) {
        return h0 + t * (h1 - h0);
    };

    this.events = new Events(["changepalette", "changerange"]);

    this.staticBlockTemplate =
        '<div class="alpBlock alpBlock-{tag}" style="display:{display}">\
             <div class="alpRadioTab">\
               <input type= "radio" class="alpRadio" name= "alpRadio" value="{id}" checked/>\
             </div>\
             <div class="alpColorTab">\
               <div class="alpCaption">{title}</div>\
               <div class="alpPaletteSlider alpS-{id}"></div>\
               <div class="alpPaletteColors alpP-{id}"></div>\
               <div class="alpPaletteValues alpV-{id}"></div>\
             </div>\
           </div>';

    this.nonStaticBlockTemplate =
        '<div class="alpBlock alpBlock-{tag}" style="display:{display}">\
           <div class="alpRadioTab">\
             <input type= "radio" class="alpRadio" name= "alpRadio" value="{id}" />\
           </div>\
           <div class="alpColorTab">\
             <div class="alpCaption">{title}</div>\
             <div class="alpPaletteSlider alpS-{id}"></div>\
             <div class="alpPaletteColors alpP-{id}"></div>\
             <div class="alpPaletteValues alpV-{id}">\
               <div class="alpInp" style="margin-left: -15px; margin-right: 15px;"><input type="text" class="alpMin" /></div>\
               <div class="alpValues"></div>\
               <div class="alpInp" style="margin-left: 10px"><input type="text" class="alpMax" /></div>\
             </div>\
           </div>\
         </div>';

    this.distributionTemplate =
        '<div class="alpBlock alpBlock-{tag}" style="display:{display}">\
             <div class="alpRadioTab">\
               <input type= "radio" class="alpRadio" name= "alpRadio" value="{id}"/>\
             </div>\
             <div class="alpColorTab">\
               <div class="alpCaption">Распределение NDVI</div>\
               <div class="alpPaletteColors">\
                 <div style="background-color:#FE0001"></div>\
                 <div style="background-color:#F5D238"></div>\
                 <div style="background-color:#D3FEBF"></div>\
                 <div style="background-color:#4FE003"></div>\
                 <div style="background-color:#2E8B20"></div>\
               </div>\
               <div class="alpPaletteValues">\
                 <div style="margin-left: 0px; text-align: left; padding: 0;">0%</div>\
                 <div>20%</div>\
                 <div>40%</div>\
                 <div>60%</div>\
                 <div>80%</div>\
                 <div style="padding: 0;text-align: right;">100%</div>\
               </div>\
             </div>\
           </div>'

    this.template = "<div>";
    for (var i = 0; i < _palettes.length; i++) {
        var p = _palettes[i];
        var t;

        if (p.isStatic) {
            t = replaceSubstring(this.staticBlockTemplate, {
                'id': i.toString(),
                'title': p.title || "",
                'tag': p.tag || "default",
                'display': p.display || "block"
            });
        } else {
            t = replaceSubstring(this.nonStaticBlockTemplate, {
                'id': i.toString(),
                'title': p.title || "",
                'tag': p.tag || "default",
                'display': p.display || "block"
            });
        }
        this.template += t;
    }
    this.template += "</div>";

    this.model.events.on("loadend", this, function (e) {
        this._renderPalettes();
    });

    this.render = function () {
        this.$el = $($.parseHTML(this.template));
        this.el = this.$el[0];

        var that = this;
        var radios = this.el.querySelectorAll('input[type=radio][name="alpRadio"]');
        Array.prototype.forEach.call(radios, function (radio) {
            radio.addEventListener('change', function () {
                that.model.setSelectedPaletteIndex(parseInt(this.value));
                that._refreshPaletteShades();
                that.events.dispatch(that.events.changepalette, that.model.getSelectedPaletteIndex());
            });
        });

        for (var i = 0; i < _palettes.length; i++) {
            (function (ii) {
                var p = _palettes[ii];
                if (!p.isStatic) {
                    var inpMin = that.el.querySelector(".alpV-" + ii + " .alpMin"),
                        inpMax = that.el.querySelector(".alpV-" + ii + " .alpMax");

                    function _checkValue(evt) {
                        var c = String.fromCharCode(evt.keyCode);
                        var val;
                        if (evt.keyCode == 8) {
                            val = this.value.substr(0, this.value.length - 1);
                        } else {
                            if (evt.keyCode == 190) {
                                c = ".";
                            }
                            val = this.value + c;
                        }
                        return val;
                    };

                    function _checkNumber(evt) {
                        if (evt.keyCode == 8 || evt.keyCode == 190 || event.keyCode >= 48 && event.keyCode <= 57) {
                            return true;
                        }
                        return false;
                    };

                    inpMin.addEventListener('keydown', function (evt) {

                        if (evt.keyCode == 37 || evt.keyCode == 39) {
                            return;
                        }

                        if (!_checkNumber(evt)) {
                            evt.preventDefault();
                            return;
                        }

                        var p = that.model.palettes[ii];
                        var v = _checkValue.call(this, evt);

                        if (!isNaN(v)) {
                            v = parseFloat(v);
                            if (v >= p.max) {
                                evt.preventDefault();
                                return;
                            }
                            p.min = v;
                            if (p.min < p.max) {
                                that._renderAnaliticalPalette(ii);
                                that.events.dispatch(that.events.changerange, this);
                            }
                        } else {
                            evt.preventDefault();
                        }
                    });

                    inpMax.addEventListener('keydown', function (evt) {

                        if (evt.keyCode == 37 || evt.keyCode == 39) {
                            return;
                        }

                        if (!_checkNumber(evt)) {
                            evt.preventDefault();
                            return;
                        }

                        var p = that.model.palettes[ii];
                        var v = _checkValue.call(this, evt);

                        if (!isNaN(v)) {
                            v = parseFloat(v);
                            if (v > 1) {
                                evt.preventDefault();
                                return;
                            }
                            if (v > 0 && v < p.min) {
                                evt.preventDefault();
                                return;
                            }
                            p.max = v;
                            if (p.min < p.max) {
                                that._renderAnaliticalPalette(ii);
                                that.events.dispatch(that.events.changerange, this);
                            }
                        } else {
                            evt.preventDefault();
                        }
                    });
                }
            })(i);
        }


        function insertAfter(el, referenceNode) {
            referenceNode.parentNode.insertBefore(el, referenceNode.nextSibling);
        }

        var distrEl = this._renderDistributionLegend();

        //insertAfter
        insertAfter(distrEl, this.el.childNodes[0]);

        return this;
    };

    this._renderDistributionLegend = function () {
        var t = replaceSubstring(this.distributionTemplate, {
            'id': 1001,
            'title': p.title || "",
            'tag': "distribution",
            'display': "block"
        });

        var $el = $($.parseHTML(t));

        var that = this;

        $el[0].querySelector('input[type=radio][name="alpRadio"]').addEventListener('change', function () {
            that.model.setSelectedPaletteIndex(parseInt(this.value));
            that._refreshPaletteShades();
            that.events.dispatch(that.events.changepalette, that.model.getSelectedPaletteIndex());
        });

        return $el[0];
    };

    this._setDistributionNDVIValues = function (values) {
        var i = 0;
        this.el.querySelectorAll(".alpBlock-distribution .alpPaletteValues div").forEach(function (e) {
            e.innerHTML = values[i][0] + "(" + values[i][1] + "%)";
            i += 1;
        });
    };

    this.getDistributionNDVIColor = function (ndvi) {
        //
        //...
        //
    };

    this.initialize();

    function _precision(a) {
        if (!isFinite(a)) return 0;
        var e = 1, p = 0;
        while (Math.round(a * e) / e !== a) { e *= 10; p++; }
        return p;
    };

    this.getLegendHTML = function (p, className) {
        var el = document.createElement('div');
        className && el.classList.add(className);
        el.innerHTML =
            '<div class="alpColorTab">\
                <div class="alpPaletteColors alpP-static"></div>\
                <div class="alpPaletteValues alpV-static"></div>\
             </div>';

        var colorLine = '<div class="alpPaletteShade"></div><div class="alpPaletteShade"></div>',
            valueLine = "";
        var pi = p,
            startIndex = -1,
            size;
        var scale = pi.scale,
            min = pi.min,
            max = pi.max;

        var PRECISION = 2;

        if (min === 0 && max === 1) {
            PRECISION = 1;
        }

        for (var j = 0; j < scale.length; j++) {
            var scalej = scale[j];
            if (scalej) {
                if (startIndex == -1) {
                    startIndex = j;
                    size = scale.length - startIndex;
                }
                colorLine += '<div class="alpColorCell" style="background-color:' + Legend.RGBToHex(scalej.partRed, scalej.partGreen, scalej.partBlue) + '"></div>';
                var v = "";
                if (startIndex != -1 && ((j - startIndex) % 10) == 0) {
                    v = _lerp((j - startIndex) / size, max, min);
                    if (v == 0.0 || v == 1.0) {
                        v = parseInt(v);
                    }
                    if (j > startIndex && j < scale.length - 1) {
                        v = v.toFixed(PRECISION);
                        v = '<div style="margin-left:-7px">' + v + '</div>';
                    } else {
                        if ((j - startIndex) === 0) {
                            v = min;
                        } else {
                            v = max;
                            if (v < 1.0) {
                                var offset = 10;
                                if (_precision(v) > 1) {
                                    offset = 15;
                                }
                                v = '<div style="margin-left:-' + offset + 'px">' + v + '</div>';
                            }
                        }
                    }
                }
                valueLine += '<div class="alpValueCell">' + v + '</div>';
            }
        }
        el.querySelector(".alpP-static").innerHTML = colorLine;
        el.querySelector(".alpV-static").innerHTML = valueLine;

        return el;
    };

    this._renderStaticPalette = function () {
        var p = this.model.palettes;

        for (var i = 0; i < p.length; i++) {

            var colorLine = '<div class="alpPaletteShade"></div><div class="alpPaletteShade"></div>',
                valueLine = "";
            var pi = p[i],
                startIndex = -1,
                size;
            var scale = pi.scale;

            for (var j = 0; j < scale.length; j++) {
                var scalej = scale[j];
                if (scalej) {
                    if (startIndex == -1) {
                        startIndex = j;
                        size = scale.length - startIndex;
                    }
                    colorLine += '<div class="alpColorCell" style="background-color:' + Legend.RGBToHex(scalej.partRed, scalej.partGreen, scalej.partBlue) + '"></div>';
                    var v = "";
                    if (startIndex != -1 && ((j - startIndex) % 10) == 0) {
                        v = _lerp((j - startIndex) / size, 1.0, 0.0);
                        v = v.toFixed(1);
                        if (v == 0.0 || v == 1.0) {
                            v = parseInt(v);
                        }
                        if (j > startIndex && j < scale.length - 1) {
                            v = '<div style="margin-left:-7px">' + v + '</div>';
                        }
                    }
                    valueLine += '<div class="alpValueCell">' + v + '</div>';
                }
            }
            this.$el.find(".alpP-" + i).html(colorLine);

            if (pi.isStatic) {
                this.$el.find(".alpV-" + i).html(valueLine);
            }

            this._bindSlider(i);
        }
    };

    this._bindSlider = function (i) {
        var pi = this.model.palettes[i];
        this.sliders[i] = new NdviSlider(this.$el.find(".alpS-" + i)[0], SLIDER_CONTAINER_SIZE, [pi.sliderMin, pi.sliderMax], {
            'paletteIndex': i
        });
        var that = this;
        this.sliders[i].on("mouseup", function (e) {
            that.events.dispatch(that.events.changerange, that.model);
        });
        this.sliders[i].on("move", function (e) {
            var palIndex = this.properties.paletteIndex;
            that.model.setSliderRange(palIndex, e.range[0], e.range[1]);
            if (palIndex === that.model.getSelectedPaletteIndex()) {
                var rp = this.getPixelRange();
                that._applyPaletteShade(palIndex, rp[0], rp[1]);
            }
            that._showDistribution(this);
        });
    }

    this._renderAnaliticalPalette = function (p) {

        var _render = function (i) {
            var pi = this.model.palettes[i];
            var min = pi.min,
                max = pi.max,
                scale = pi.scale;
            var startIndex = 7;
            var size = 101;
            var valueLine = "";
            for (var j = 7; j < 93; j++) {
                var v = "";
                if (j % 10 == 0) {
                    v = _lerp(j / size, max, min);
                    v = v.toFixed(2);
                    if (v == 0.0 || v == 1.0) {
                        v = parseInt(v);
                    }
                    if (j > 7 && j < 93) {
                        v = '<div style="margin-left:-11px">' + v + '</div>';
                    }
                }
                valueLine += '<div class="alpValueCell">' + v + '</div>';
            }

            this.$el.find(".alpV-" + i + " .alpValues").html(valueLine);

        }.bind(this);

        if (p != null) {
            _render(p);
            this._showDistribution(this.sliders[p]);
        } else {
            for (var i = 0; i < _palettes.length; i++) {
                if (!_palettes.isStatic) {
                    _render(i);
                }
            }
        }
    };

    this._refreshPaletteShades = function () {
        var index = this.model.getSelectedPaletteIndex();
        for (var i = 0; i < this.sliders.length; i++) {
            if (index === i) {
                var rp = this.sliders[i].getPixelRange();
                this._applyPaletteShade(i, rp[0], rp[1]);
                this.$el.find(".alpS-" + i + " .alpSlider").removeClass("alpSliderInactive");
            } else {
                this._applyPaletteShade(i, SLIDER_CONTAINER_SIZE, 0);
                this.$el.find(".alpS-" + i + " .alpSlider").addClass("alpSliderInactive");
            }
        }

        this.$el.find('input:radio[name="alpRadio"]').filter('[value="' + index + '"]')[0].checked = true;
    };

    this._applyPaletteShade = function (paletteIndex, left, right) {
        var shades = this.$el.find(".alpP-" + paletteIndex + " .alpPaletteShade");
        shades[0].style.width = left + "px";
        shades[1].style.left = right + "px";
        shades[1].style.width = (SLIDER_CONTAINER_SIZE - right) + "px";
    };

    this.refreshRangeValues = function () {
        for (var i = 0; i < this.model.palettes.length; i++) {
            if (!this.model.palettes[i].isStatic) {
                this.$el.find(".alpV-" + i + " .alpMin").attr('value', this.model.palettes[i].min);
                this.$el.find(".alpV-" + i + " .alpMax").attr('value', this.model.palettes[i].max);
            }
        }
    };

    this._renderPalettes = function () {
        this._renderStaticPalette();
        this._renderAnaliticalPalette();
        this.refreshRangeValues();
        this._refreshPaletteShades();
    };

    this.displayTags = function (tagArr) {

        var s = this.el.querySelectorAll(".alpBlock");

        for (var kk = 0; kk < s.length; kk++) {
            var e = s[kk];

            var visible = false;
            for (var i = 0; i < tagArr.length; i++) {
                if (e.classList.contains("alpBlock-" + tagArr[i])) {
                    visible = true;
                    break;
                }
            }
            if (visible) {
                e.style.display = "block";
            } else {
                e.style.display = "none";
            }
        }
    };

    this.bindSelectionHandler = function (handler) {
        this._selectionHandler = handler;
    };

    this.refreshDistribution = function () {
        for (var i = this.sliders.length - 1; i >= 0; --i) {
            this._showDistribution(this.sliders[i]);
        }
    };

    this._createNDVIDistributionPalette = function () {
        if (this.model._ndviDistr) {

            var hAcc = this.model._ndviDistr.Hist256Acc;
            var allPixels = this.model._ndviDistr.ValidPixels;
            this.model._ndviDistr.palette = new Array(255);

            var colors = [
                [0, 0, 0, 0],
                shared.htmlColorToRgba("#FE0001"),
                shared.htmlColorToRgba("#F5D238"),
                shared.htmlColorToRgba("#D3FEBF"),
                shared.htmlColorToRgba("#4FE003"),
                shared.htmlColorToRgba("#2E8B20")];

            var ndviArr = [0.0, 0.0, 0.0, 0.0, 0.0, 0.0];
            var distrArr = [0.0, 0.0, 0.0, 0.0, 0.0, 0.0];
            var _D = [0.0, 0.20, 0.40, 0.60, 0.80, 1.00];

            var curr = 1;

            var SIZE = 256;

            for (var i = 0; i < SIZE; i++) {
                this.model._ndviDistr.palette[i] = colors[curr];

                var p = hAcc[i] / allPixels;

                if (p >= _D[curr]) {
                    ndviArr[curr] = (i - 1) * 0.01 - 1.01;
                    distrArr[curr] = hAcc[i - 1] / allPixels;
                    curr++;
                }
            }
        }
    };

    this._showDistribution = function (slider) {
        if (this.model._ndviDistr) {
            var min = this.model.palettes[slider.properties.paletteIndex].min,
                max = this.model.palettes[slider.properties.paletteIndex].max;
            var h = this.model._ndviDistr.Bands.r.Hist256;
            var allPixels = this.model._ndviDistr.ValidPixels;

            var r = slider.getRange();

            var i0 = Math.floor((min + r[0] * (max - min) + 1.01) / 0.01),
                i1 = Math.floor((min + r[1] * (max - min) + 1.01) / 0.01);

            r0 = this.model._ndviDistr.Hist256Acc[i0] / allPixels;
            r1 = this.model._ndviDistr.Hist256Acc[i1] / allPixels;


            slider.setValues(Math.round(r0 * 100.0) + '%', Math.round(r1 * 100.0) + '%');
        } else {
            slider.setValues("", "");
        }
    };

    this.appendDistribution = function () {
        var date = this._selectionHandler.TEST_getSelectionDate(),
            layers = this._selectionHandler.TEST_getSelectionLayers();
        var _this = this;
        this._getHist256(date, layers[0], function (data) {
            _this.model._ndviDistr = data;

            _this.model._ndviDistr.Hist256Acc = null;
            _this.model._ndviDistr.Hist256Acc = new Array(256);
            var sum = 0;
            for (var i = 0; i < 255; i++) {
                sum += data.Bands.r.Hist256[i];
                _this.model._ndviDistr.Hist256Acc[i] = sum;
            }

            _this._createNDVIDistributionPalette();

            _this.refreshDistribution();
        });
    };

    this.clearHist = function () {
        this.model._ndviDistr = null;
        this._requestID = 0;
    };

    this.clearDistribution = function () {
        this.clearHist();
        this.refreshDistribution();
    };

    this._getHist256 = function (date, layer, callback) {

        this.clearHist();
        this.refreshDistribution();

        var sel = this._selectionHandler.TEST_getSelectedFieldsLayers();

        if (sel.length === 0 || !layer) return;

        this._requestID++;

        var prop = layer.getGmxProperties();

        var layersExt = [{ "LayerID": prop.LayerID, "Filter": "[" + prop.TemporalColumnName + "]='" + date + "'", "FilterByBorder": true }];

        var request = {
            BorderFromLayers: sel,
            "Items": [{
                "Name": this._requestID,
                "LayersExt": layersExt,
                "Bands": ["r"],
                "Return": ["Hist"],
                "NoData": [0, 0, 0]
            }]
        };

        var url = 'http://maps.kosmosnimki.ru/plugins/getrasterhist.ashx';

        var formData = new FormData();
        formData.append('WrapStyle', 'None');
        formData.append('Request', JSON.stringify(request));
        formData.append('sync', shared.getCookie("sync"));

        var _this = this;

        fetch(url, {
            body: formData,
            credentials: 'include',
            method: 'POST'
        })
            .then(function (resp) {
                return resp.json();
            })
            .then(function (resp) {
                if (_this._requestID === parseInt(resp.Result[0].Name)) {
                    callback && callback(resp.Result[0]);
                }
            });
    };
};

inheritance.extend(NDVILegendView, LegendView);

NDVILegendView.locale = {
    'rus': {
        'CvetovajaShkalaNdvi': "Цветовая шкала NDVI",
        'EstestvennayaShkala': "Базовая шкала",
        'AnaliticheskayaShkala': "Аналитическая шкала"
    },
    'eng': {
        'CvetovajaShkalaNdvi': "Color NDVI Scale",
        'EstestvennayaShkala': "Basic scale",
        'AnaliticheskayaShkala': "Analitical scale"
    }
};
