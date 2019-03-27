var gulp = require('gulp');
var concat = require('gulp-concat');
var header = require('gulp-header');
var footer = require('gulp-footer');
var streamqueue = require('streamqueue');
var html2jsobject = require('gulp-html2jsobject');

var styles = ['./timeline/timeline.css', './timeline/gmxTimelineControl.css', 'style.css', 'agroLegend/agroLegend.css'];

var scripts = ['./timeline/timeline.js', './timeline/LineItem.js', './timeline/gmxTimelineControl.js',
    'shared/shared.js', 'shared/RequestsQueue.js', 'shared/ThematicHandler.js', 'shared/styleHookManager.js',
    'agroLegend/ndviSlider.js', 'agroLegend/legendDialog.js', 'agroLegend/events.js', 'agroLegend/inheritance.js',
    'agroLegend/replaceSubstring.js', 'agroLegend/legendModel.js', 'agroLegend/legendView.js', 'agroLegend/odnorodnostLegendView.js',
    'agroLegend/ratingLegendView.js', 'agroLegend/ndviLegend.js', 'agroLegend/ndviLegendView.js', 'agroLegend/legendControl.js',
    'agroLegend/qualityLegendView.js', 'agroLegend/conditionsOfVegetationLegendView.js',
    'timelineParams.js', 'timelineProxyLayer.js', 'switchControl.js', 'optionsMenu.js', 'ndviTimelineSlider.js', 'ndviTimelineManager.js',
    'meanVCIManager.js', 'bindScrollControl.js', 'agroWarning.js', 'rating.js', 'ajax.js', 'L.Control.gmxAgroTimeline.js'];

var images = [];

gulp.task('default', function() {
    var sourcesStream = gulp.src(scripts);

    var cssStream = gulp.src(styles)

    var jsStream = streamqueue({
            objectMode: true
        }, sourcesStream)
        .pipe(footer(';'))
        .pipe(concat('agroTimeline.js'));

    var imgStream = gulp.src(images);

    var finalStream = streamqueue({
            objectMode: true
        }, jsStream, cssStream, imgStream)
        .pipe(gulp.dest('build'));
});

gulp.task('watch', ['default'], function() {
    console.log([].concat(styles, scripts, templates));
    gulp.watch([].concat(styles, scripts, templates), ['default']);
});