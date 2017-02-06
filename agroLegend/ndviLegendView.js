var NDVILegendView = function () {
    inheritance.base(this, new NDVILegend({
        'name': "Цветовая шкала NDVI",
        'width': 480,
        'height': 220,
        'palettes': [{
            'url': "http://maps.kosmosnimki.ru/api/plugins/palettes/NDVI_interp_legend.icxleg.xml",
            'min': 0.0,
            'max': 1.0
        }, {
            'url': "http://maps.kosmosnimki.ru/api/plugins/palettes/NDVI_BLUE_interp_legend.icxleg.xml",
            'min': 0.0,
            'max': 1.0
        }]
    }));

    var SLIDER_CONTAINER_SIZE = 404;

    this.sliders = [];

    var _lerp = function (t, h1, h0) {
        return h0 + t * (h1 - h0);
    };

    this.events = new Events(["changepalette", "changerange"]);

    this.template = '<div><div class="alpBlock">\
                      <div class="alpRadioTab"><input type="radio" class="alpRadio" name="alpRadio" value="0" checked/></div>\
                      <div class="alpColorTab">\
                        <div class="alpCaption">Естественная шкала</div>\
                        <div class="alpPaletteSlider alpS-0"></div>\
                        <div class="alpPaletteColors alpP-0"></div>\
                        <div class="alpPaletteValues alpV-0"></div>\
                      </div>\
                    </div>\
                    \
                    <div class="alpBlock">\
                      <div class="alpRadioTab"><input type="radio" class="alpRadio" name="alpRadio" value="1"/></div>\
                      <div class="alpColorTab">\
                        <div class="alpCaption">Аналитическая шкала</div>\
                        <div class="alpPaletteSlider alpS-1"></div>\
                        <div class="alpPaletteColors alpP-1"></div>\
                        <div class="alpPaletteValues alpV-1"></div>\
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
                that._refreshPaletteShades();
                that.events.dispatch(that.events.changepalette, that.model._selectedPaletteIndex);
            });
        });

        return this;
    };

    this.initialize();

    this._renderStaticPalettes = function () {
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
            this.$el.find(".alpV-" + i).html(valueLine);

            this.sliders[i] = new NdviSlider(this.$el.find(".alpS-" + i)[0], SLIDER_CONTAINER_SIZE, [pi.min, pi.max], {
                'paletteIndex': i
            });
            var that = this;
            this.sliders[i].on("mouseup", function (e) {
                that.events.dispatch(that.events.changerange, that.model);
            });
            this.sliders[i].on("move", function (e) {
                var palIndex = this.properties.paletteIndex;
                that.model.setRange(palIndex, e.range[0], e.range[1]);
                if (palIndex === that.model.getSelectedPaletteIndex()) {
                    var rp = this.getPixelRange();
                    that._applyPaletteShade(palIndex, rp[0], rp[1]);
                }
            });
        }
        this._refreshPaletteShades();
    };

    this._refreshPaletteShades = function () {
        for (var i = 0; i < this.sliders.length; i++) {
            if (this.model.getSelectedPaletteIndex() === i) {
                var rp = this.sliders[i].getPixelRange();
                this._applyPaletteShade(i, rp[0], rp[1]);
            } else {
                this._applyPaletteShade(i, SLIDER_CONTAINER_SIZE, 0);
            }
        }
    };

    this._applyPaletteShade = function (paletteIndex, left, right) {
        var shades = this.$el.find(".alpP-" + paletteIndex + " .alpPaletteShade");
        shades[0].style.width = left + "px";
        shades[1].style.left = right + "px";
        shades[1].style.width = (SLIDER_CONTAINER_SIZE - right) + "px";
    };

    this._renderPalettes = function () {
        this._renderStaticPalettes();
    };
};

inheritance.extend(NDVILegendView, LegendView);