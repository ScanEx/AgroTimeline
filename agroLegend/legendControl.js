var LegendControl = function (agroTimeline) {
    var that = this;

    var _BOTTOM = 150,
        _RIGHT = 12;

    if (window.cosmosagro) {
        _BOTTOM = 153;
        _RIGHT = 56;
    }

    var _visibility = false;

    var _hideAll = false;

    this._manual = false;

    var _isNDVI = false;

    this.timeline = agroTimeline;

    this._dialog = new LegendDialog();
    this._dialog.setPositionRightBottom(_RIGHT, _BOTTOM);
    this._dialog.onclose = function () {
        that.setVisibility(false);
        that._manual = true;
    };

    window.addEventListener('resize', function (e) {
        that._dialog.setPositionRightBottom(_RIGHT, _BOTTOM);
    });

    this._ratingLegendView = new RatingLegendView();
    this._odnorodnostLegendView = new OdnorodnostLegendView();
    this._ndviLegendView = new NDVILegendView();
    this._qualityLegendView = new QualityLegendView();
    this._conditionsOfVegetationLegendView = new ConditionsOfVegetationLegendView();

    this._btn = document.createElement("div");
    this._btn.classList.add("legendControlButton");
    this._btn.style.display = "none";
    this._btn.onclick = function () {
        that._manual = true;
        if (that._dialog.getVisibility()) {
            that.setVisibility(false);
        } else {
            that.setVisibility(true);
        }
    };

    this.hide = function () {
        _hideAll = true;
        this.setVisibility(false);
    };

    this.setVisibility = function (visibility) {

        if (_hideAll) {
            this._dialog.setVisibility(false);
            this._btn.classList.add("legendControlButton-active");
        } else {

            if (visibility != _visibility) {
                _visibility = visibility;
                if (visibility) {
                    this._btn.classList.add("legendControlButton-active");
                } else {
                    this._btn.classList.remove("legendControlButton-active");
                }
                this._dialog.setVisibility(visibility);
            }
        }
    };

    this.getVisibility = function () {
        return _visibility;
    };

    this.showButton = function () {
        this._btn.style.display = "block";
    };

    this.hideButton = function () {
        this._btn.style.display = "none";
        this.setVisibility(false);
    };

    this.getContainer = function () {
        return this._btn;
    };

    this.applyLegend = function (legendView) {
        this._dialog.$content.html(legendView.$el);
        this._dialog.setCaption(legendView.model.name);
        this._dialog.setSize(legendView.model.width, legendView.model.height);
        this._dialog.setPositionRightBottom(_RIGHT, _BOTTOM);
    };

    var _x = null;
    this._ndviLegendView.events.on("changepalette", null, function () {
        clearTimeout(_x);
        _x = setTimeout(function () {
            agroTimeline.repaint();
        }, 180);
    });

    this._ndviLegendView.events.on("changerange", null, function () {
        clearTimeout(_x);
        _x = setTimeout(function () {
            agroTimeline.repaint();
        }, 180);
    });

    agroTimeline.events.on("changeselection", null, function (t) {
        var so = t._selectedOption;
        _isNDVI = false;
        if (so == "CONDITIONS_OF_VEGETATION") {
            that.showButton();
            that.applyLegend(that._conditionsOfVegetationLegendView);
            if (!that._manual) {
                that.setVisibility(true);
            }
        } else if (so == "QUALITY16") {
            that.showButton();
            that.applyLegend(that._qualityLegendView);
            if (!that._manual) {
                that.setVisibility(false);
            }
        } else if (so == "NDVI16") {
            _isNDVI = true;
            that.showButton();
            that.applyLegend(that._ndviLegendView);
            if (!that._manual) {
                that.setVisibility(false);
            }
        } else if (so == "HR" || so == "MEAN_NDVI" || so == "SENTINEL_NDVI" || so == "LANDSAT_MSAVI" || so == "SENTINEL_MSAVI") {
            _isNDVI = true;
            that.showButton();
            that.applyLegend(that._ndviLegendView);
            if (!that._manual) {
                that.setVisibility(true);
            }

            t.refreshExperimentalPalettes();;

        } else if (so == "RATING") {
            that.showButton();
            that.applyLegend(that._ratingLegendView);
            if (!that._manual) {
                that.setVisibility(true);
            }
        } else if (so == "INHOMOGENUITY") {
            that.showButton();
            that.applyLegend(that._odnorodnostLegendView);
            if (!that._manual) {
                that.setVisibility(true);
            }
        } else {
            that.hideButton();
        }
    });

    agroTimeline.events.on("clearselection", null, function (t) {
        that.hideButton();
        if (that._ndviLegendView) {
            that._ndviLegendView.clearDistribution();
        }
    });

    this.getNDVIColor = function (ndviValue) {
        return this._ndviLegendView.model.getNDVIColor(ndviValue);
    };

    this.isNDVI = function () {
        return _isNDVI;
    };

    this.bindSelectionHandler = function (handler) {
        this._ndviLegendView.bindSelectionHandler(handler);

        handler.events.on("changeselection", this, function () {
            if (this.isNDVI()) {
                this._ndviLegendView.appendDistribution();
            }
        });

        this.timeline.events.on("changeselection", this, function (t) {
            if (this.isNDVI()) {
                this._ndviLegendView.appendDistribution();
            }
        });
    };
};