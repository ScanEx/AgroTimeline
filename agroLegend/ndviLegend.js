var NDVILegend = function (options) {
    inheritance.base(this, options);

    this.events = new Events(["loadend"]);

    this.palettes = [];

    this._selectedPaletteIndex = 0;

    var defArr = [],
        that = this;
    for (var i = 0; i < options.palettes.length; i++) {
        (function (ii) {
            var def = new $.Deferred();
            defArr.push(def);
            shared.loadPaletteSync(options.palettes[ii].url).then(function (pal) {
                var startIndex = 0;
                for (var i = 0; i < pal.length; i++) {
                    if (pal[i]) {
                        startIndex = i;
                        break;
                    }
                }
                that.palettes[ii] = {
                    'title': options.palettes[ii].title || "",
                    'startIndex': startIndex,
                    'min': options.palettes[ii].min || 0.0,
                    'max': options.palettes[ii].max || 1.0,
                    'sliderMin': options.palettes[ii].sliderMin || 0.0,
                    'sliderMax': options.palettes[ii].sliderMax || 1.0,
                    'scale': pal,
                    'isStatic': options.palettes[ii].isStatic != undefined ? options.palettes[ii].isStatic : true
                };
                def.resolve();
            });
        })(i);
    }

    $.when.apply($, defArr).then(function () {
        that.events.dispatch(that.events.loadend, that);
    });

    this.getSelectedPalette = function () {
        return this.palettes[this._selectedPaletteIndex];
    };

    this.getNDVIColor = function (ndviValue) {
        var p = this.palettes[this._selectedPaletteIndex];
        var d = p.max - p.min;
        var palValue = (ndviValue - p.min) / d;
        var sliderMin = p.min + p.sliderMin * d,
            sliderMax = p.min + p.sliderMax * d;
        var rangeValue = p.min + palValue * d;

        if (rangeValue < sliderMin && p.sliderMin > 0 ||
            rangeValue > sliderMax && p.sliderMax < 1) {
            return [0, 0, 0, 0];
        }

        var index = Math.round((p.scale.length - p.startIndex) * palValue + p.startIndex);
        if (index < p.startIndex) {
            index = p.startIndex;
        } else if (index >= p.scale.length) {
            index = p.scale.length - 1;
        }
        var res = [0, 0, 0, 0];
        var c = p.scale[index];
        if (c)
            res = [c.partRed, c.partGreen, c.partBlue, 255];

        return res;
    };

    this.setSelectedPaletteIndex = function (index) {
        this._selectedPaletteIndex = index;
    };

    this.getSelectedPaletteIndex = function () {
        return this._selectedPaletteIndex;
    };

    this.setRange = function (index, min, max) {
        this.palettes[index].min = min;
        this.palettes[index].max = max;
    };

    this.setSliderRange = function (index, min, max) {
        this.palettes[index].sliderMin = min;
        this.palettes[index].sliderMax = max;
    };
};

inheritance.extend(NDVILegend, Legend);