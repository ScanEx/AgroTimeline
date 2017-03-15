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

    this.getNDVIColor = function (ndviValue) {
        var p = this.palettes[this._selectedPaletteIndex];
        var rangeValue = (ndviValue - p.min) / (p.max - p.min);
        var sliderMin = (p.sliderMin - p.min) / (p.max - p.min),
            sliderMax = (p.sliderMax - p.min) / (p.max - p.min);
        if (rangeValue >= sliderMin && rangeValue <= sliderMax) {
            var index = Math.round((p.scale.length - p.startIndex) * rangeValue + p.startIndex);
            if (index < p.startIndex) {
                index = p.startIndex;
            } else if (index >= p.scale.length) {
                index = p.scale.length - 1;
            }
            var c = p.scale[index];
            return [c.partRed, c.partGreen, c.partBlue, 255];
        } else {
            return [0, 0, 0, 0];
        }
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