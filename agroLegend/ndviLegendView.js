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

    this.events = new Events(["changepalette", "changerange", "loadend"]);

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

    this._ndviDistributionPalette = ["#FE0001", "#F5D238", "#D3FEBF", "#4FE003", "#2E8B20"];

    this.distributionTemplate =
        '<div class="alpBlock alpBlock-{tag}" style="display:{display}">\
             <div class="alpRadioTab alpRadioDisabled">\
               <div class="alpRadioShade"></div>\
               <input type= "radio" class="alpRadio" name= "alpRadio" value="{id}"/>\
             </div>\
             <div class="alpColorTab">\
               <div class="alpCaption">Распределение NDVI</div>\
               <div class="alpPaletteDistrValues">\
                 <div></div>\
                 <div></div>\
                 <div></div>\
                 <div></div>\
                 <div></div>\
               </div >\
               <div class="alpPaletteColors">\
                 <div class="alpPaletteShade"></div>\
                 <div style="background-color:{0}"></div>\
                 <div style="background-color:{1}"></div>\
                 <div style="background-color:{2}"></div>\
                 <div style="background-color:{3}"></div>\
                 <div style="background-color:{4}"></div>\
               </div>\
               <div class="alpPaletteValues">\
                 <div style="margin-left: 0px; text-align: left; padding: 0;"></div>\
                 <div></div>\
                 <div></div>\
                 <div></div>\
                 <div></div>\
                 <div style="padding: 0;text-align: right;"></div>\
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
                                that.model.update();
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
                                that.model.update();
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
        insertAfter(distrEl, this.el.childNodes[1]);

        return this;
    };

    this._renderDistributionLegend = function () {
        var t = replaceSubstring(this.distributionTemplate, {
            'id': NDVILegend.DISTRIBUTION,
            'title': p.title || "",
            'tag': "distribution",
            'display': "block",
            '0': this._ndviDistributionPalette[0],
            '1': this._ndviDistributionPalette[1],
            '2': this._ndviDistributionPalette[2],
            '3': this._ndviDistributionPalette[3],
            '4': this._ndviDistributionPalette[4]
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

    this._setDistributionNDVIValues = function (el, values, distributionValues) {
        var arr = el.querySelectorAll(".alpBlock-distribution .alpPaletteValues div");
        for (var i = 0; i < arr.length; i++) {
            arr[i].innerHTML = values[i];
        }

        if (distributionValues) {
            arr = el.querySelectorAll(".alpPaletteDistrValues div");
            for (i = 0; i < arr.length; i++) {
                arr[i].innerHTML = distributionValues[i];
            }
        }
    };

    this.initialize();

    function _precision(a) {
        if (!isFinite(a)) return 0;
        var e = 1, p = 0;
        while (Math.round(a * e) / e !== a) { e *= 10; p++; }
        return p;
    };

    this.getLegendHTML = function (className) {
        var index = this.model._selectedPaletteIndex;

        if (index === NDVILegend.DISTRIBUTION) {
            var el = document.createElement('div');
            className && el.classList.add(className);

            el.innerHTML = replaceSubstring(
                '<div class="alpBlock alpBlock-distribution" style="height: 56px;">\
             <div class="alpColorTab">\
               <div class="alpPaletteDistrValues">\
                 <div></div>\
                 <div></div>\
                 <div></div>\
                 <div></div>\
                 <div></div>\
               </div >\
               <div class="alpPaletteColors">\
                 <div style="background-color:{0}"></div>\
                 <div style="background-color:{1}"></div>\
                 <div style="background-color:{2}"></div>\
                 <div style="background-color:{3}"></div>\
                 <div style="background-color:{4}"></div>\
               </div>\
               <div class="alpPaletteValues">\
                 <div style="margin-left: 0px; text-align: left; padding: 0;"></div>\
                 <div></div>\
                 <div></div>\
                 <div></div>\
                 <div></div>\
                 <div style="padding: 0;text-align: right;"></div>\
               </div>\
             </div>\
           </div>', {
                    '0': this._ndviDistributionPalette[0],
                    '1': this._ndviDistributionPalette[1],
                    '2': this._ndviDistributionPalette[2],
                    '3': this._ndviDistributionPalette[3],
                    '4': this._ndviDistributionPalette[4]
                });

            //this._createNDVIDistributionPalette(el);

            this._setDistributionNDVIValues(
                el,
                this.model._ndviDistr.ndviArr.map(function (e) {
                    return e.toFixed(2)
                }),
                this.model._ndviDistr.distrArr
            );

            return el;
        } else {
            var p = this.model.palettes[index];

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
        }
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

        if (index !== NDVILegend.DISTRIBUTION) {
            this.el.querySelector(".alpBlock.alpBlock-distribution .alpPaletteShade").style.width = SLIDER_CONTAINER_SIZE + "px";
        } else {
            this.el.querySelector(".alpBlock.alpBlock-distribution .alpPaletteShade").style.width = 0 + "px";
        }

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

        this._createNDVIDistributionPalette(this.el);
    };

    this._createNDVIDistributionPalette = function (el) {
        if (this.model._ndviDistr) {

            var hAcc = this.model._ndviDistr.Hist256Acc;
            var allPixels = 1.0 / this.model._ndviDistr.ValidPixels;
            var allPixels_100 = allPixels * 100.0;
            this.model._ndviDistr.palette = new Array(255);

            var c1 = shared.htmlColorToRgba(this._ndviDistributionPalette[0]),
                c2 = shared.htmlColorToRgba(this._ndviDistributionPalette[1]),
                c3 = shared.htmlColorToRgba(this._ndviDistributionPalette[2]),
                c4 = shared.htmlColorToRgba(this._ndviDistributionPalette[3]),
                c5 = shared.htmlColorToRgba(this._ndviDistributionPalette[4]);

            var colors = [
                { 'r': 0, 'g': 0, 'b': 0, 'a': 0 },
                { 'r': c1[0], 'g': c1[1], 'b': c1[2], 'a': c1[3] },
                { 'r': c2[0], 'g': c2[1], 'b': c2[2], 'a': c2[3] },
                { 'r': c3[0], 'g': c3[1], 'b': c3[2], 'a': c3[3] },
                { 'r': c4[0], 'g': c4[1], 'b': c4[2], 'a': c4[3] },
                { 'r': c5[0], 'g': c5[1], 'b': c5[2], 'a': c5[3] }
            ];

            var ndviArr = [0, 0, 0, 0, 0, 0];
            var distrArr = [0, 0, 0, 0, 0, 0];
            var _D = [0.0, 0.20, 0.40, 0.60, 0.80, 0.99];

            var SIZE = 256;
            var curr = 1;
            var pal = this.model._ndviDistr.palette;

            //TODO: объединить два следующих цикла
            for (var i = 100; i < SIZE; i++) {
                if (hAcc[i] > 0) {
                    distrArr[0] = hAcc[i] * allPixels_100;
                    ndviArr[0] = i * 0.01 - 1.01;
                    break;
                }
            }
            for (var i = 0; i < SIZE; i++) {

                var p = hAcc[i] * allPixels;

                if (p >= _D[curr]) {
                    var pp = hAcc[i - 1] * allPixels_100;
                    distrArr[curr] = pp;
                    ndviArr[curr] = (i - 1) * 0.01 - 1.01;
                    curr++;
                }

                if (curr < colors.length) {
                    pal[i] = colors[curr] || colors[0];
                } else {
                    pal[i] = colors[colors.length - 1];
                }
            }

            var l = distrArr.length - 1;
            for (var i = 0; i < l; i++) {
                var pp = distrArr[i + 1] - distrArr[i];
                if (Math.round(pp) === 0) {
                    pp = pp.toFixed(1);
                } else {
                    pp = Math.round(pp);
                }
                distrArr[i] = pp + "%";
            };

            this.model._ndviDistr.ndviArr = ndviArr;
            this.model._ndviDistr.distrArr = distrArr;

            this._setDistributionNDVIValues(
                el,
                ndviArr.map(function (e) {
                    return e.toFixed(2)
                }),
                distrArr
            );
        }
    };

    this._showDistribution = function (slider) {
        if (this.model._ndviDistr) {
            var min = this.model.palettes[slider.properties.paletteIndex].min,
                max = this.model.palettes[slider.properties.paletteIndex].max;
            var h = this.model._ndviDistr.Bands.r.Hist256;
            var allPixels = 1.0 / this.model._ndviDistr.ValidPixels;

            var r = slider.getRange();

            var i0 = Math.floor((min + r[0] * (max - min) + 1.01) / 0.01),
                i1 = Math.floor((min + r[1] * (max - min) + 1.01) / 0.01);

            r0 = this.model._ndviDistr.Hist256Acc[i0] * allPixels;
            r1 = this.model._ndviDistr.Hist256Acc[i1] * allPixels;

            slider.setValues(Math.round(r0 * 100.0) + '%', Math.round(r1 * 100.0) + '%');
        } else {
            slider.setValues("", "");
        }
    };

    this.appendDistribution = function () {

        if (!window.exportMode) {

            var date = this._selectionHandler.TEST_getSelectionDate(),
                layers = this._selectionHandler.TEST_getSelectionLayers();
            var _this = this;
            this._getHist256(date, layers[0], function (data) {
                _this.model._ndviDistr = data;

                _this.model._ndviDistr.Hist256Acc = null;
                var _histAcc = _this.model._ndviDistr.Hist256Acc = new Array(256);

                var sum = 0;
                for (var i = 0; i < 256; i++) {
                    sum += data.Bands.r.Hist256[i];
                    _histAcc[i] = sum;
                }

                _this._createNDVIDistributionPalette(_this.el);

                _this.refreshDistribution();

                if (_this.model.isDistribution()) {
                    _this.events.dispatch(_this.events.changepalette, _this.model.getSelectedPaletteIndex());
                }
            });
        }
    };

    this.clearHist = function () {
        this.model._ndviDistr = null;
        this._requestID = 0;
        this._setDistributionNDVIValues(this.el, ['', '', '', '', '', ''], ['', '', '', '', '', '']);
    };

    this.clearDistribution = function () {
        this.clearHist();
        this.refreshDistribution();
    };

    this._getHist256 = function (date, layer, callback) {

        var sel = this._selectionHandler.TEST_getSelectedFieldsLayers();

        var fieldCount = 0;
        for (var i = 0; i < sel.length; i++) {
            fieldCount += sel[i].gmx_id.length;
        }


        //if (sel) {

        this.clearHist();
        this.refreshDistribution();

        if (sel.length === 0 || !layer || fieldCount > NDVILegend.MAX_SELECTED_FIELDS) {

            this.el.querySelector(".alpBlock.alpBlock-distribution .alpRadioTab").classList.add("alpRadioDisabled");

            if (this.model.isDistribution()) {
                this.events.dispatch(this.events.changepalette, this.model.getSelectedPaletteIndex());
            }

            //stop distribution
            return;

        } else {
            this.el.querySelector(".alpBlock.alpBlock-distribution .alpRadioTab").classList.remove("alpRadioDisabled");
        }

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
        //}
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
