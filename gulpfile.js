const { src, series, parallel, dest } = require("gulp")
const browserSync = require("browser-sync").create()
const watch = require("gulp-watch")
const sass = require("gulp-sass")(require("sass"))
const pug = require("gulp-pug")
const del = require("del")
const webp = require("gulp-webp")
const include = require("gulp-include")
const sourcemaps = require("gulp-sourcemaps")
const notify = require("gulp-notify")
const plumber = require("gulp-plumber")
const uglify = require("gulp-uglify")
const babel = require("gulp-babel")
const postcss = require("gulp-postcss")
const postcssImport = require("postcss-import")
const postcssURL = require("postcss-url")
const postcssCSSO = require("postcss-csso")
const autoprefixer = require("autoprefixer")

// Пути к файлам
const publicFolder = "./public/"
const sourceFolder = "./src/"

const path = {
  build: {
    html: publicFolder,
    css: `${publicFolder}assets/css/`,
    js: `${publicFolder}assets/js/`,
    img: `${publicFolder}assets/images/`,
    video: `${publicFolder}assets/videos/`,
    docs: `${publicFolder}assets/docs/`,
    fonts: `${publicFolder}assets/fonts/`,
  },
  src: {
    html: `${sourceFolder}views/pages/**/*.pug`,
    css: `${sourceFolder}assets/sass/main.sass`,
    js: `${sourceFolder}assets/js/index.js`,
    img: `${sourceFolder}assets/images/**/*`,
    video: `${sourceFolder}assets/videos/**/*`,
    docs: `${sourceFolder}assets/docs/**/*`,
    fonts: `${sourceFolder}assets/fonts/**/*`,
  },
  watch: {
    html: `${sourceFolder}views/**/*.pug`,
    css: `${sourceFolder}**/*.+(sass|scss|css)`,
    js: `${sourceFolder}**/*.js`,
    img: `${sourceFolder}assets/images/**/*`,
    video: `${sourceFolder}assets/videos/**/*`,
    docs: `${sourceFolder}assets/docs/**/*`,
    fonts: `${sourceFolder}assets/fonts/**/*`,
  }
}

//---- Обновление страницы
const browserReload = (done) => {
  browserSync.reload()
  done()
}
//---- Очистка папки /dist
const cleanDev = () => del(publicFolder)
//---- Очистка папки /images
const cleanImages = () => del(path.build.img)
//---- Очистка папки /fonts
const cleanFonts = () => del(path.build.fonts)

//---- Сборка PUG файлов
const streamPug = () => src(path.src.html)
  .pipe(plumber({
    errorHandler: notify.onError((err) => ({
        title: "PUG",
        sound: false,
        message: err.message,
      }))
  }))
  .pipe(pug({ pretty: true }))
  .pipe(dest(path.build.html))
  .pipe(browserSync.stream())

//---- Компиляция JS файлов
const streamJs = () => src(path.src.js)
  .pipe(plumber({
    errorHandler: notify.onError((err) => ({
      title: "JS",
      sound: false,
      message: err.message
    }))
  }))
  .pipe(sourcemaps.init())
  .pipe(babel({ presets: ["@babel/env"] }))
  .pipe(include())
  .pipe(uglify())
  .pipe(sourcemaps.write("../maps"))
  .pipe(dest(path.build.js))

//---- Компиляция SASS файлов
const streamSass = (callback) => {
  const plugins = [
    postcssImport(),
    postcssURL(),
    postcssCSSO(),
    autoprefixer({ overrideBrowserslist: ["> 0.1%"] })
  ]

  src(path.src.css)
    .pipe(sourcemaps.init())
    .pipe(sass().on("error", sass.logError))
    .pipe(postcss(plugins))
    .pipe(sourcemaps.write("../maps"))
    .pipe(dest(path.build.css))
    .pipe(browserSync.stream())
  callback()
}

//---- Конвертирование картинок
const convertWebp = () => src([path.src.img, "!src/assets/images/favicon{,/**}"])
  .pipe(webp({ quality: 75 }))
  .pipe(dest(path.build.img))

const copyImg = () => src(path.src.img)
  .pipe(dest(path.build.img))

//---- Копирование шрифтов
const copyFonts = () => src(path.src.fonts)
  .pipe(dest(path.build.fonts))

//---- Задача для отслеживания изменений файлов
const watchTask = (callback) => {
  watch(path.watch.img, series(cleanImages, copyImg, convertWebp, browserReload))
  watch(path.watch.fonts, series(cleanFonts, copyFonts, browserReload))
  watch(path.watch.css, series(streamSass))
  watch(path.watch.js, series(streamJs, browserReload))
  watch(path.watch.html, series(streamPug))

  callback()
}

//---- Задача для старта сервера
const serverTask = () => {
  browserSync.init({
    server: { baseDir: publicFolder },
    notify: false
  })
}

exports.clean = series(cleanDev)
exports.default = series(
  parallel(streamSass, streamPug, streamJs, copyImg, convertWebp, copyFonts),
  watchTask, serverTask
)
