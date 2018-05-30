var NDVILegend = function (options) {
    inheritance.base(this, options);

    this.events = new Events(["loadend"]);

    this.palettes = [];

    this._selectedPaletteIndex = 0;

    var _p = null;
    var _d = 0;
    var _oneBy_d = 0.0;
    var _sliderMin = 0;
    var _sliderMax = 0;
    var _startIndex = 0;
    var BLACK = [0, 0, 0, 0];

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
        that.setSelectedPaletteIndex(0);
        that.events.dispatch(that.events.loadend, that);
    });

    this.getSelectedPalette = function () {
        return this.palettes[this._selectedPaletteIndex];
    };

    this.getNDVIColor = function (ndviValue) {

        var palValue = (ndviValue - _p.min) * _oneBy_d,
            rangeValue = _p.min + palValue * _d;

        if (rangeValue < _sliderMin && _p.sliderMin > 0 ||
            rangeValue > _sliderMax && _p.sliderMax < 1) {
            return BLACK;
        }

        var index = Math.round((_startIndex) * palValue + _p.startIndex);

        if (index < _p.startIndex) {
            index = _p.startIndex;
        } else if (index >= _p.scale.length) {
            index = _p.scale.length - 1;
        }

        var c = _p.scale[index];

        if (c)
            return [c.partRed, c.partGreen, c.partBlue, 255];
        else
            return BLACK;
    };

    this.setNDVIColor = function (ndviValue, dstPix, ind) {

        var palValue = (ndviValue - _p.min) * _oneBy_d,
            rangeValue = _p.min + palValue * _d;

        if (rangeValue < _sliderMin && _p.sliderMin > 0 ||
            rangeValue > _sliderMax && _p.sliderMax < 1) {
            dstPix[ind] = 0;
            dstPix[ind + 1] = 0;
            dstPix[ind + 2] = 0;
            dstPix[ind + 3] = 0;
            return;
        }

        var index = Math.round((_startIndex) * palValue + _p.startIndex);

        if (index < _p.startIndex) {
            index = _p.startIndex;
        } else if (index >= _p.scale.length) {
            index = _p.scale.length - 1;
        }

        var c = _p.scale[index];

        if (c) {
            dstPix[ind] = c.partRed;
            dstPix[ind + 1] = c.partGreen;
            dstPix[ind + 2] = c.partBlue;
            dstPix[ind + 3] = 255;
        } else {
            dstPix[ind] = 0;
            dstPix[ind + 1] = 0;
            dstPix[ind + 2] = 0;
            dstPix[ind + 3] = 0;
        }
    };

    this.update = function () {
        _p = this.palettes[this._selectedPaletteIndex];
        _d = _p.max - _p.min;
        _sliderMin = _p.min + _p.sliderMin * _d;
        _sliderMax = _p.min + _p.sliderMax * _d;
        _oneBy_d = 1 / _d;
        _startIndex = _p.scale.length - _p.startIndex;
    };

    this.setSelectedPaletteIndex = function (index) {
        this._selectedPaletteIndex = index;
        this.update();
    };

    this.getSelectedPaletteIndex = function () {
        return this._selectedPaletteIndex;
    };

    this.setRange = function (index, min, max) {
        this.palettes[index].min = min;
        this.palettes[index].max = max;
        this.update();
    };

    this.setSliderRange = function (index, min, max) {
        this.palettes[index].sliderMin = min;
        this.palettes[index].sliderMax = max;
        this.update();
    };
};

inheritance.extend(NDVILegend, Legend);