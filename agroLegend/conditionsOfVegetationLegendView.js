var ConditionsOfVegetationLegendView = function () {

    var lang = L.gmxLocale.getLanguage();

    inheritance.base(this, new Legend({
        'width': 480,
        'height': 220,
        'name': ConditionsOfVegetationLegendView.locale[lang].IndexUslovijVegetacii
    }));

    this.template =
    '<div style="top:50%; left: 50%; margin-left:-210px; margin-top: -77px; position: absolute; width: 152px">\
       <table class="legendTable" style="width:340px">\
         <tbody>\
           <tr>\
             <td><div class="legendColorh" style="background-color:rgb(0, 128, 0); margin-left: 0; margin-right: 0;width:{cellWidth};"></div></td>\
             <td> ' + ConditionsOfVegetationLegendView.locale[lang].SushestvennoLuchshe + '</td>\
           </tr>\
           <tr>\
             <td><div class="legendColorh" style="background-color:rgb(0, 255, 0); margin-left: 0; margin-right: 0;width:{cellWidth};"></div></td>\
             <td> ' + ConditionsOfVegetationLegendView.locale[lang].Luchshe + '</td>\
           </tr>\
           <tr>\
             <td><div class="legendColorh" style="background-color:rgb(255, 255, 0); margin-left: 0; margin-right: 0;width:{cellWidth};"></div></td>\
             <td> ' + ConditionsOfVegetationLegendView.locale[lang].Blizko + '</td>\
           </tr>\
           <tr>\
             <td><div class="legendColorh" style="background-color:rgb(255, 128, 128); margin-left: 0; margin-right: 0;width:{cellWidth};"></div></td>\
             <td> ' + ConditionsOfVegetationLegendView.locale[lang].Huzhe + '</td>\
           </tr>\
           <tr>\
             <td><div class="legendColorh" style="background-color:rgb(255, 0, 0); margin-left: 0; margin-right: 0;width:{cellWidth};"></div></td>\
             <td> ' + ConditionsOfVegetationLegendView.locale[lang].SushestvennoHuzhe + '</td>\
           </tr>\
         </tbody>\
       </table>\
     </div>';

    this.render = function () {
        this.$el = $($.parseHTML(replaceSubstring(this.template, {
            'cellWidth': "30px"
        })));
        this.el = this.$el[0];

        return this;
    };

    this.initialize();
};

inheritance.extend(ConditionsOfVegetationLegendView, LegendView);

ConditionsOfVegetationLegendView.locale = {
    'rus': {
        'IndexUslovijVegetacii': "Индекс условий вегетации",
        'SushestvennoLuchshe': "существенно лучше среднего многолетнего",
        'Luchshe': "лучше среднего многолетнего",
        'Blizko': "близко к среднему многолетнему",
        'Huzhe': "хуже среднего многолетнего",
        'SushestvennoHuzhe': "существенно хуже среднего многолетнего"
    },
    'eng': {
        'IndexUslovijVegetacii': "Vegetation Condition Index",
        'SushestvennoLuchshe': "Significantly better of average yearly",
        'Luchshe': "Better of average yearly",
        'Blizko': "Close to average yearly",
        'Huzhe': "Worse of average yearly",
        'SushestvennoHuzhe': "Significantly worse of average yearly"
    }
}