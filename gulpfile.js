var gulp        = require('gulp'),
    jade        = require('gulp-jade'),
    sass        = require('gulp-sass'),
    prefix      = require('gulp-autoprefixer'),
    minifycss   = require('gulp-minify-css'),
    gcmq        = require('gulp-group-css-media-queries'), // объединение media queries
    sourcemaps  = require('gulp-sourcemaps'), // sourcemaps
    jshint      = require('gulp-jshint'),
    concat      = require('gulp-concat'),
    uglify      = require('gulp-uglify'),
    useref      = require('gulp-useref'), // для обьединения css и js файлов
    notify      = require("gulp-notify"), // выводим ошибки
    imagemin    = require('gulp-imagemin'),
    pngquant    = require('imagemin-pngquant'),
    cache       = require('gulp-cache'),
    browserSync = require('browser-sync'),

    /*
        for SVG sprite
    */
    svgSprite  = require('gulp-svg-sprite'), // создание спрайта
    svgmin     = require('gulp-svgmin'), // минификация SVG
    cheerio    = require('gulp-cheerio'), // удаление лишних атрибутов из svg
    replace    = require('gulp-replace'), // фиксинг некоторых багов, об этом ниже

    /*
        for Jekyll
    */
    cp          = require('child_process');





// Build the Jekyll Site
//--------------------------------------------------
var messages = {
    jekyllBuild: '<span style="color: grey">Running:</span> $ jekyll build'
};


gulp.task('jekyll-build', function (done) {
    browserSync.notify(messages.jekyllBuild);
    var pl = process.platform === "win32" ? "jekyll.bat" : "jekyll";
    return cp.spawn(pl, ['build'], {stdio: 'inherit'})
        .on('close', done);
});


// Rebuild Jekyll & do page reload
//--------------------------------------------------
gulp.task('jekyll-rebuild', ['jekyll-build'], function () {
    browserSync.reload();
});



// Wait for jekyll-build, then launch the Server
//--------------------------------------------------
gulp.task('browser-sync', ['sass', 'js-main', 'jekyll-build'], function() {
    browserSync({
        server: {
            baseDir: '_site'
        },
        notify: false
    });
});


// Compile Jade
//--------------------------------------------------
gulp.task('jade', function() {
    return gulp.src('_jadefiles/**/*.jade')
    .pipe(jade({
        pretty: true
    }))
    .pipe(gulp.dest('_includes/'));
});


// Sass
//--------------------------------------------------
gulp.task('sass', function () {
    return gulp.src('assets/sass/main.sass')
        .pipe(sourcemaps.init())
        .pipe(sass())
        .on('error', notify.onError(function(err) {
            return {
                title: 'Sass',
                message: err.message
            }
        }))
        .pipe(prefix(['last 15 versions', '> 1%', 'ie 8', 'ie 7'], { cascade: true }))
        .pipe(gulp.dest('assets/css/'))
        .pipe(gcmq())
        // .pipe(sourcemaps.write(''))
        // .pipe(gulp.dest('assets/css/'))
        .pipe(minifycss())
        .pipe(gulp.dest('_site/assets/css/'))
        .pipe(browserSync.reload({stream:true}));
});



// JS
//--------------------------------------------------
gulp.task('js-main', function() {
    return gulp.src('assets/js/function.js')
        .pipe(jshint())
        .pipe(jshint.reporter('default'))
        // .pipe(concat('function.js'))
        .pipe(gulp.dest('assets/js'))
        .pipe(uglify())
        // .pipe(gulp.dest('js'))
        .pipe(gulp.dest('_site/assets/js'));
});

gulp.task('js-vendor', function() {
    return gulp.src([
        'assets/libs/jquery/dist/jquery.js',
        'assets/libs/svg4everybody/dist/svg4everybody.js'
        ])
        .pipe(concat('vendor.js')) // объединяем стороние бибилиотеки
        .pipe(uglify())
        .pipe(gulp.dest('_site/assets/js/'))
});




// Images
//--------------------------------------------------
gulp.task('imagemin', function() {
    return gulp.src(['assets/img/**/*'])
        .pipe(cache(imagemin({
            interlaced: true,
            progressive: true,
            svgoPlugins: [{removeViewBox: false}],
            use: [pngquant()]
        })))
        .pipe(gulp.dest('_site/img'));
});



// SVG спрайты
//--------------------------------------------------
gulp.task('svg-sprite', function() {

    return gulp.src('assets/img/icon-svg/*.svg')
        // минифицируем svg
        .pipe(svgmin({
            js2svg: {
                pretty: true
            }
        }))
        // убираем все лишнее из спрайта
        .pipe(cheerio({
            run: function ($) {
                $('[fill]').removeAttr('fill');
                $('[stroke]').removeAttr('stroke');
                $('[style]').removeAttr('style');
            },
            parserOptions: {xmlMode: true}
        }))
        // у этого плагина есть баг, он преобразует ">" в '&gt;'
        // исправляем
        .pipe(replace('&gt;', '>'))
        // создаем спрайт и кладем в нужную папку
        .pipe(svgSprite({
            mode: {
                symbol: {
                    sprite: "../img/svg-sprite.svg",
                    render: {
                        scss: {
                            dest:'../sass/modules/_sprite_template.scss',
                            template: 'assets/sass/mixins/_sprite_template.scss'
                        }
                    }
                }
            }
        }))
        .pipe(gulp.dest('assets/'));

});


// Watch
//--------------------------------------------------
gulp.task('watch', function () {
    gulp.watch('assets/js/**/*.js', ['js-main']).on("change", browserSync.reload);
    gulp.watch('assets/sass/**/*', ['sass']);
    gulp.watch(['*.html', '_layouts/*.html', '_posts/*', '_includes/*'], ['jekyll-rebuild']);
    gulp.watch('_jadefiles/**/*.jade', ['jade']);
});



// Default
//--------------------------------------------------
gulp.task('default', ['browser-sync', 'js-vendor', 'watch']);
