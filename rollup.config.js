// import babel from 'rollup-plugin-babel';

export default {
    input: 'src/index.js',
    indent: '\t',
    plugins: [
        // babel()
    ],
    sourcemap: true,
    output: [
        {
        format: 'umd',
        name: 'nb4w',
        file: 'projects/modules/build.js'
        // file: 'apps_dev/viewer/build.js'
        }
    ]
};