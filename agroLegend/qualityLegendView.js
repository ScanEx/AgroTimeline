var QualityLegendView = function () {
    inheritance.base(this, new Legend({
        'width': 480,
        'height': 220,
        'name': "Оценка качества композита NDVI"
    }));

    this.template =
    '<div style="top:50%; left: 50%; margin-left:-210px; margin-top: -77px; position: absolute; width: 152px">\
       <table class="legendTable" style="width:300px">\
         <tbody>\
           <tr>\
             <td><div class="legendColorh" style="background-color:rgb(255, 255, 179); margin-left: 0; margin-right: 0;width:{cellWidth};"></div></td>\
             <td> данные хорошего качества</td>\
           </tr>\
           <tr>\
             <td><div class="legendColorh" style="background-color:rgb(255, 128, 0); margin-left: 0; margin-right: 0;width:{cellWidth};"></div></td>\
             <td> данные уловлетворительного качества</td>\
           </tr>\
           <tr>\
             <td><div class="legendColorh" style="background-color:rgb(128, 0, 255); margin-left: 0; margin-right: 0;width:{cellWidth};"></div></td>\
             <td> снег/лед</td>\
           </tr>\
           <tr>\
             <td><div class="legendColorh" style="background-color:rgb(0, 255, 255); margin-left: 0; margin-right: 0;width:{cellWidth};"></div></td>\
             <td> облака</td>\
           </tr>\
           <tr>\
             <td><div class="legendColorh" style="background-color:rgb(255, 0, 0); margin-left: 0; margin-right: 0;width:{cellWidth};"></div></td>\
             <td> данные отсутствуют</td>\
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