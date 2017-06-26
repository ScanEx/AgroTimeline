var QualityLegendView = function () {

    var lang = L.gmxLocale.getLanguage();

    inheritance.base(this, new Legend({
        'width': 480,
        'height': 220,
        'name': QualityLegendView.locale[lang].OcenkaKachestvaKompozitaNdvi
    }));

    this.template =
    '<div style="top:50%; left: 50%; margin-left:-210px; margin-top: -77px; position: absolute; width: 152px">\
       <table class="legendTable" style="width:300px">\
         <tbody>\
           <tr>\
             <td><div class="legendColorh" style="background-color:rgb(255, 255, 179); margin-left: 0; margin-right: 0;width:{cellWidth};"></div></td>\
             <td> ' + QualityLegendView.locale[lang].DannieHoroshegoKachestva + '</td>\
           </tr>\
           <tr>\
             <td><div class="legendColorh" style="background-color:rgb(255, 128, 0); margin-left: 0; margin-right: 0;width:{cellWidth};"></div></td>\
             <td> ' + QualityLegendView.locale[lang].DannieUdovletvoritelnogoKachestva + '</td>\
           </tr>\
           <tr>\
             <td><div class="legendColorh" style="background-color:rgb(128, 0, 255); margin-left: 0; margin-right: 0;width:{cellWidth};"></div></td>\
             <td> ' + QualityLegendView.locale[lang].SnegLed + '</td>\
           </tr>\
           <tr>\
             <td><div class="legendColorh" style="background-color:rgb(0, 255, 255); margin-left: 0; margin-right: 0;width:{cellWidth};"></div></td>\
             <td> '+ QualityLegendView.locale[lang].Oblaka + '</td>\
           </tr>\
           <tr>\
             <td><div class="legendColorh" style="background-color:rgb(255, 0, 0); margin-left: 0; margin-right: 0;width:{cellWidth};"></div></td>\
             <td> ' + QualityLegendView.locale[lang].NoData + '</td>\
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

inheritance.extend(QualityLegendView, LegendView);

QualityLegendView.locale = {
    'rus': {
        'OcenkaKachestvaKompozitaNdvi': "Оценка качества композита NDVI",
        'DannieHoroshegoKachestva': "данные хорошего качества",
        'DannieUdovletvoritelnogoKachestva': "данные уловлетворительного качества",
        'SnegLed': "снег/лед",
        'Oblaka': "облака",
        'NoData': "данные отсутствуют"
    },
    'eng': {
        'OcenkaKachestvaKompozitaNdvi': "MODIS NDVI Quality Evaluation",
        'DannieHoroshegoKachestva': "good quality",
        'DannieUdovletvoritelnogoKachestva': "fair quality",
        'SnegLed': "snow/ice",
        'Oblaka': "clouds",
        'NoData': "no data"
    }
};