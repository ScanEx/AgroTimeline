var NDVILegendView = function () {

    var lang = L.gmxLocale.getLanguage();

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

    inheritance.base(this, new NDVILegend({
        'name': NDVILegendView.locale[lang].CvetovajaShkalaNdvi,
        'width': 480,
        'height': 235,
        'palettes': _palettes
    }));

    var SLIDER_CONTAINER_SIZE = 404;

    this.sliders = [];

    var _lerp = function (t, h1, h0) {
        return h0 + t * (h1 - h0);
    };

    this.events = new Events(["changepalette", "changerange"]);

    this.staticBlockTemplate =
        '<div class="alpBlock alpBlock-{tag}" style="display:{display}">\
             <div class="alpRadioTab">\
               <input type= "radio" class="alpRadio" name= "alpRadio" value= "{id}" checked/>\
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
             <input type= "radio" class="alpRadio" name= "alpRadio" value= "{id}" />\
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
                that.model._selectedPaletteIndex = parseInt(this.value);
                that._refreshPaletteShades();
                that.events.dispatch(that.events.changepalette, that.model._selectedPaletteIndex);
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

        return this;
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
                <div class="alpCaption">'+ p.title + '</div>\
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
                        v = v.toFixed(1);
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
    }
};

inheritance.extend(NDVILegendView, LegendView);

NDVILegendView.locale = {
    'rus': {
        'CvetovajaShkalaNdvi': "Цветовая шкала NDVI",
        'EstestvennayaShkala': "Естественная шкала",
        'AnaliticheskayaShkala': "Аналитическая шкала"
    },
    'eng': {
        'CvetovajaShkalaNdvi': "Color NDVI Scale",
        'EstestvennayaShkala': "True color scale",
        'AnaliticheskayaShkala': "Analitical scale"
    }
};
