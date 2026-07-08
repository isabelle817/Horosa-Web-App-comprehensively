const buildForFile = process.env.BUILD_FOR_FILE === '1';

export default {
	publicPath: buildForFile ? './' : '/static/',
	outputPath: buildForFile ? 'dist-file' : 'dist',
	history: buildForFile ? { type: 'hash' } : undefined,
	hash: true,
	dva: {
		immer: false,
	},
	antd: {},
	dynamicImport: {},
	// 性能分包:多个技法路由 chunk 曾各自内联同一批重依赖(three/lunar/kinastro 等被双份
	// 打进 5.7MB+4.8MB 两个 chunk,双份下载双份解析)。把 ≥2 处引用的重库/重源码提成命名
	// async vendor chunk;moment 裁掉未用 locale(zh-cn 在 layouts 显式 import 完整路径,
	// 不受 IgnorePlugin 的 context 匹配影响,保留)。回退=注释本段(kill-switch)。
	chainWebpack(config, { webpack }) {
		config.merge({
			optimization: {
				splitChunks: {
					chunks: 'async',
					minSize: 30000,
					maxInitialRequests: 12,
					maxAsyncRequests: 16,
					cacheGroups: {
						vendorsGl: {
							name: 'vendors-gl',
							test: /[\\/]node_modules[\\/](three)[\\/]/,
							chunks: 'async',
							priority: 30,
							minChunks: 2,
							reuseExistingChunk: true,
						},
						vendorsViz: {
							name: 'vendors-viz',
							test: /[\\/]node_modules[\\/](echarts|zrender|d3|d3-[^\\/]+|@antv)[\\/]/,
							chunks: 'async',
							priority: 28,
							minChunks: 2,
							reuseExistingChunk: true,
						},
						vendorsCalendar: {
							name: 'vendors-calendar',
							test: /[\\/]node_modules[\\/](lunar-javascript|sxtwl)[\\/]/,
							chunks: 'async',
							priority: 26,
							minChunks: 2,
							reuseExistingChunk: true,
						},
						sharedTechnique: {
							name: 'shared-technique',
							test: /[\\/]src[\\/](components[\\/](kinastro|comp|xq-ui)|utils|data|constants)[\\/]/,
							chunks: 'async',
							priority: 20,
							minChunks: 2,
							minSize: 60000,
							reuseExistingChunk: true,
						},
					},
				},
			},
		});
		// 只保留 zh-cn(IgnorePlugin 在本 webpack 版本会连显式 import 的 zh-cn 一起裁掉,
		// 实测破坏中文日期 → 改用 ContextReplacement 精确白名单)
		config.plugin('moment-locale-trim')
			.use(webpack.ContextReplacementPlugin, [/moment[\\/]locale$/, /zh-cn/]);
	},
	dll: false,
	hardSource: false,
	pwa: false,
	hd: false,
	fastClick: false,
	title: '星阙 - 玄学与星座云平台',
}
