var LegendControl = function (agroTimeline) {
    var that = this;

    var _BOTTOM = 150,
        _RIGHT = 12;

    var _visibility = false;

    this.timeline = agroTimeline;

    this._dialog = new LegendDialog();
    this._dialog.setPositionRightBottom(_RIGHT, _BOTTOM);
    this._dialog.onclose = function () {
        that.setVisibility(false);
    };

    window.addEventListener('resize', function (e) {
        that._dialog.setPositionRightBottom(_RIGHT, _BOTTOM);
    });

    this._ratingLegendView = new RatingLegendView();
    this._odnorodnostLegendView = new OdnorodnostLegendView();
    this._ndviLegendView = new NDVILegendView();

    this._btn = document.createElement("div");
    this._btn.classList.add("legendControlButton");
    this._btn.style.display = "none";
    this._btn.onclick = function () {
        if (that._dialog.getVisibility()) {
            that.setVisibility(false);
        } else {
            that.setVisibility(true);
        }
    };

    this.setVisibility = function (visibility) {
        if (visibility != _visibility) {
            _visibility = visibility;
            if (visibility) {
                this._btn.classList.add("legendControlButton-active");
            } else {
                this._btn.classList.remove("legendControlButton-active");
            }
            this._dialog.setVisibility(visibility);
        }
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

    this._ndviLegendView.events.on("changepalette", null, function () {
        agroTimeline.repaint();
    });

    this._ndviLegendView.events.on("changerange", null, function () {
        agroTimeline.repaint();
    });

    agroTimeline.events.on("changeselection", null, function (t) {
        var so = t._selectedOption;
        if (so == "HR" || so == "MEAN_NDVI" || so == "SENTINEL_NDVI" || so == "NDVI16") {
            that.showButton();
            that.applyLegend(that._ndviLegendView);
            //that._ndviLegendView.rebindEvents();
        } else if (so == "RATING") {
            that.showButton();
            that.applyLegend(that._ratingLegendView);
        } else if (so == "INHOMOGENUITY") {
            that.showButton();
            that.applyLegend(that._odnorodnostLegendView);
        } else {
            that.hideButton();
        }
    });

    agroTimeline.events.on("clearselection", null, function (t) {
        that.hideButton();
    });

    this.getNDVIColor = function (ndviValue) {
        return this._ndviLegendView.model.getNDVIColor(ndviValue);
    };
};