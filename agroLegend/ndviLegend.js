var NDVILegend = function (options) {
    inheritance.base(this, options);

    this.events = new Events(["loadend"]);

    this.palettes = [];

    this._selectedPaletteIndex = 0;

    this._ready = false;

    var _p = null;
    var _oneBy_d = 0.0;
    var _sliderMin = 0;
    var _sliderMax = 0;
    var _startIndex = 0;
    var BLACK = [0, 0, 0, 0];
    this._ndviDistr = null;

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
        that._ready = true;
        that.setSelectedPaletteIndex(0);
        that.events.dispatch(that.events.loadend, that);
    });

    this.isReady = function () {
        return this._ready;
    };

    this.getSelectedPalette = function () {
        return this.palettes[this._selectedPaletteIndex];
    };

    this.getNDVIColor = function (ndviValue) {

        var palValue = (ndviValue - _p.min) * _oneBy_d;

        if (ndviValue < _sliderMin && _p.sliderMin > 0 ||
            ndviValue > _sliderMax && _p.sliderMax < 1) {
            return BLACK;
        }

        var index = Math.round(_startIndex * palValue + _p.startIndex);

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

    //this.getNDVIDistribution = function (ndvi, min, max) {
    //    if (this._ndviDistr) {
    //        min = min || 0.0;
    //        max = max || 1.0;

    //        var h = this._ndviDistr.Bands.r.Hist256;
    //        var allPixels = this._ndviDistr.ValidPixels;

    //        var r = slider.getRange();
    //        var sum = 0;

    //        var SIZE = 255,
    //            SIZE_ONE = SIZE + 1;

    //        for (var i = 0; i < SIZE_ONE; i++) {
    //            sum += h[i];
    //            if ((i * 0.01 - 1.01) >= min + ndvi * (max - min)) {
    //                return sum / allPixels;
    //            }
    //        }

    //        return 1.0;
    //    }
    //};

    this.getNDVIDistribution = function () {
        return this._ndviDistr;
    };

    this.setNDVIDistribution = function (ndviDistr) {
        this._ndviDistr = ndviDistr;
        this.update();
    };

    this.setNDVIColor = function (ndviGrey, dstPix, ind) {

        if (this.isDistribution()) {

            if (this._ndviDistr) {

                var c = this._ndviDistr.palette[ndviGrey];

                dstPix[ind] = c.r;
                dstPix[ind + 1] = c.g;
                dstPix[ind + 2] = c.b;
                dstPix[ind + 3] = c.a;

            } else {

                dstPix[ind] = 0;
                dstPix[ind + 1] = 0;
                dstPix[ind + 2] = 0;
                dstPix[ind + 3] = 0;

            }

        } else {

            var ndviValue = ndviGrey * 0.01 - 1.01;

            if (ndviValue < _sliderMin && _p.sliderMin > 0 ||
                ndviValue > _sliderMax && _p.sliderMax < 1) {
                dstPix[ind] = 0;
                dstPix[ind + 1] = 0;
                dstPix[ind + 2] = 0;
                dstPix[ind + 3] = 0;
                return;
            }

            var palValue = (ndviValue - _p.min) * _oneBy_d;

            var index = Math.round(_startIndex * palValue + _p.startIndex);

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
        }
    };

    this.update = function () {
        _p = this.palettes[this._selectedPaletteIndex];
        if (_p) {
            var _d = _p.max - _p.min;
            _sliderMin = _p.min + _p.sliderMin * _d;
            _sliderMax = _p.min + _p.sliderMax * _d;
            _oneBy_d = 1 / _d;
            _startIndex = _p.scale.length - _p.startIndex;
        }
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

    this.isDistribution = function () {
        return this._selectedPaletteIndex === NDVILegend.DISTRIBUTION;
    };
};

NDVILegend.DISTRIBUTION = 1001;
NDVILegend.MAX_SELECTED_FIELDS = 100;

inheritance.extend(NDVILegend, Legend);