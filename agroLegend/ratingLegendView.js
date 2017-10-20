var RatingLegendView = function () {

    var lang = L.gmxLocale.getLanguage();

    inheritance.base(this, new Legend({
        'name': RatingLegendView.locale[lang].Rejting,
        'width': 480,
        'height': 220,
    }));

    this.template =
    '<div style="top:50%; left: 50%; margin-left:-108px; margin-top: -30px; position: absolute; width: 216px;">\
       <div style="float:left">' + RatingLegendView.locale[lang].Nizkij + '</div>\
       <div style="float:right">' + RatingLegendView.locale[lang].Visokij + '</div>\
       <table class="legendTable">\
         <tbody>\
           <tr>\
             <td><div class="legendColorh" style="background-color:#f50c32; margin-left: 0; margin-right: 0;width:{cellWidth};"></div></td>\
             <td><div class="legendColorh" style="background-color:#e39139; margin-left: 0; margin-right: 0;width:{cellWidth};"></div></td>\
             <td><div class="legendColorh" style="background-color:#e6c84e; margin-left: 0; margin-right: 0;width:{cellWidth};"></div></td>\
             <td><div class="legendColorh" style="background-color:#f0f018; margin-left: 0; margin-right: 0;width:{cellWidth};"></div></td>\
             <td><div class="legendColorh" style="background-color:#dfed5c; margin-left: 0; margin-right: 0;width:{cellWidth};"></div></td>\
             <td><div class="legendColorh" style="background-color:#b3d66d; margin-left: 0; margin-right: 0;width:{cellWidth};"></div></td>\
             <td><div class="legendColorh" style="background-color:#7deb15; margin-left: 0; margin-right: 0;width:{cellWidth};"></div></td>\
             <td><div class="legendColorh" style="background-color:#1ea312; margin-left: 0; margin-right: 0;width:{cellWidth};"></div></td>\
           </tr>\
           <tr>\
             <td><div class="legendColorh" style="background-color:rgb(0,179,255); margin-left: 0; margin-right: 0;width:{cellWidth};"></div></td>\
             <td colspan="4"><div style="float:right">' + RatingLegendView.locale[lang].Oblaka + '</div></td>\
           </tr>\
         </tbody>\
       </table>\
     </div>';

    this.render = function () {
        this.$el = $($.parseHTML(replaceSubstring(this.template, {
            'cellWidth': "24px"
        })));
        this.el = this.$el[0];

        return this;
    };

    this.initialize();
};

inheritance.extend(RatingLegendView, LegendView);

RatingLegendView.locale = {
    'rus': {
        'Rejting': "Рейтинг",
        'Visokij': "высокий",
        'Nizkij': "низкий",
        'Oblaka': "нет данных (облака)"
    },
    'eng': {
        'Rejting': "Rating",
        'Visokij': "high",
        'Nizkij': "low",
        'Oblaka': "no data (clouds)"
    }
};