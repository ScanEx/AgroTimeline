var NDVILegendView = function () {
    inheritance.base(this, new NDVILegend({
        'name': "Цветовая шкала NDVI",
        'width': 480,
        'height': 220,
        'palettes': [{
            'url': "http://maps.kosmosnimki.ru/api/plugins/palettes/NDVI_interp_legend.icxleg.xml",
        }, {
            'url': "http://maps.kosmosnimki.ru/api/plugins/palettes/NDVI_BLUE_interp_legend.icxleg.xml",
            'isStatic': false,
            'min': 0.0,
            'max': 1.0
        }]
    }));

    this.events = new Events(["changepalette", "changerange"]);

    this.template = '<div><div class="alpBlock">\
                      <div class="alpRadioTab"><input type="radio" class="alpRadio" name="alpRadio" value="0" checked/></div>\
                      <div class="alpColorTab">\
                        <div class="alpCaption">Естественная шкала</div>\
                        <div class="alpPaletteColors alpP-0"></div>\
                        <div class="alpPaletteValues alpV-0"></div>\
                      </div>\
                    </div>\
                    \
                    <div class="alpBlock">\
                      <div class="alpRadioTab"><input type="radio" class="alpRadio" name="alpRadio" value="1"/></div>\
                      <div class="alpColorTab">\
                        <div class="alpCaption">Аналитическая шкала</div>\
                        <div class="alpPaletteColors alpP-1"></div>\
                        <div class="alpPaletteValues alpV-1">\
                          <div class="alpInp"><input type="text" class="alpMin"/></div>\
                          <div class="alpValues"></div>\
                          <div class="alpInp"><input type="text" class="alpMax"/><\div>\
                        </div>\
                      </div>\
                    </div></div>';

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
                that.events.dispatch(that.events.changepalette, that.model._selectedPaletteIndex);
            });
        });

        var inpMin = this.el.querySelector(".alpV-1 .alpMin"),
            inpMax = this.el.querySelector(".alpV-1 .alpMax");

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

            var p = that.model.palettes[1];
            var v = _checkValue.call(this, evt);

            if (!isNaN(v)) {
                v = parseFloat(v);
                if (v >= p.max) {
                    evt.preventDefault();
                    return;
                }
                p.min = v;
                if (p.min < p.max) {
                    that._renderRangedPalette();
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

            var p = that.model.palettes[1];
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
                    that._renderRangedPalette();
                    that.events.dispatch(that.events.changerange, this);
                }
            } else {
                evt.preventDefault();
            }
        });


        return this;
    };

    this.initialize();

    this._renderStaticPalettes = function () {
        var p = this.model.palettes;
        for (var i = 0; i < p.length; i++) {

            var colorLine = "",
                valueLine = "";
            var pi = p[i],
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
                    if (pi.isStatic) {
                        if (startIndex != -1 && ((j - startIndex) % 10) == 0) {
                            v = _lerp((j - startIndex) / size, max, min);
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
            }
            this.$el.find(".alpP-" + i).html(colorLine);
            if (pi.isStatic) {
                this.$el.find(".alpV-" + i).html(valueLine);
            }
        }
    };

    var _lerp = function (t, h1, h0) {
        return h0 + t * (h1 - h0);
    };

    this._renderRangedPalette = function () {
        var i = 1;
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
    };

    //this.rebindEvents = function () {
    //    var p = this.model.palettes[1];
    //    var inpMin = this.$el.find(".alpV-1 .alpMin"),
    //        inpMax = this.$el.find(".alpV-1 .alpMax");

    //    function _checkValue(evt, min, max) {
    //        var c = String.fromCharCode(evt.charCode != null ? evt.charCode : evt.keyCode);
    //        var val = this.value + c;
    //        if (val == "0" || val == "0." || !isNaN(val) && parseFloat(val) >= min && parseFloat(val) <= max) {
    //            return val;
    //        }
    //        return null;
    //    };

    //    var that = this;

    //    inpMin.keypress(function (evt) {
    //        var v = _checkValue.call(this, evt, 0, p.max);
    //        if (v) {
    //            if (!isNaN(v)) {
    //                p.min = parseFloat(v);
    //                if (p.min != p.max) {
    //                    that._renderRangedPalette();
    //                    that.events.dispatch(that.events.changerange, this);
    //                }
    //            }
    //            return true;
    //        }
    //        return false;
    //    });

    //    inpMax.keypress(function (evt) {
    //        var v = _checkValue.call(this, evt, p.min, 1);
    //        if (v) {
    //            if (!isNaN(v)) {
    //                p.max = parseFloat(v);
    //                if (p.min != p.max) {
    //                    that._renderRangedPalette();
    //                    that.events.dispatch(that.events.changerange, this);
    //                }
    //            }
    //            return true;
    //        }
    //        return false;
    //    });
    //};

    this._renderPalettes = function () {
        this._renderStaticPalettes();
        this._renderRangedPalette();
        this.$el.find(".alpV-1 .alpMin").attr('value', 0);
        this.$el.find(".alpV-1 .alpMax").attr('value', 1);
        //this.rebindEvents();
    };
};

inheritance.extend(NDVILegendView, LegendView);