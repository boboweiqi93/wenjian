const fs = require('fs');
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

function readMeooProxyTarget() {
  const envPath = path.resolve(__dirname, '.env');
  if (!fs.existsSync(envPath)) return '';

  const envContent = fs.readFileSync(envPath, 'utf8');
  const match = envContent.match(/^MEOO_PROXY_TARGET=(.+)$/m);
  return match ? match[1].trim() : '';
}

function readSupabaseAnonKey() {
  const envPath = path.resolve(__dirname, '.env');
  if (!fs.existsSync(envPath)) return '';

  const envContent = fs.readFileSync(envPath, 'utf8');
  const match = envContent.match(/^SUPABASE_ANON_KEY=(.+)$/m);
  return match ? match[1].trim() : '';
}

module.exports = (env, argv) => {
  const isDev = argv.mode !== 'production';
  const meooProxyTarget = readMeooProxyTarget();
  const supabaseAnonKey = readSupabaseAnonKey();
  const localSbApiTarget = 'https://wenjian.meoo.fun';

  return {
    mode: isDev ? 'development' : 'production',
    entry: './src/index.tsx',
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: isDev ? '[name].js' : '[name].[contenthash:8].js',
      chunkFilename: isDev ? '[name].chunk.js' : '[name].[contenthash:8].chunk.js'
    },
    optimization: {
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
            priority: 10
          },
          mermaid: {
            test: /[\\/]mermaid[\\/]/,
            name: 'mermaid',
            chunks: 'all',
            priority: 20,
            reuseExistingChunk: true
          }
        }
      }
    },
    module: {
      rules: [
        {
          test: /\.(ts|tsx|js|jsx)$/,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
            options: {
              presets: [
                [
                  '@babel/preset-react',
                  {
                    runtime: 'automatic',
                    development: isDev
                  }
                ],
                '@babel/preset-env',
                '@babel/preset-typescript'
              ]
            }
          }
        },
        {
          test: /\.css$/,
          use: ['style-loader', 'css-loader', 'postcss-loader']
        }
      ]
    },
    resolve: {
      extensions: ['.ts', '.tsx', '.js', '.jsx']
    },
    devServer: {
      port: 3015,
      allowedHosts: 'all',
      proxy: (meooProxyTarget || localSbApiTarget) ? [
        {
          context: ['/sb-api'],
          target: localSbApiTarget,
          changeOrigin: true,
          secure: true,
          onProxyReq: (proxyReq, req) => {
            if (meooProxyTarget) {
              proxyReq.removeHeader('authorization');
            }
          },
        }
      ] : undefined,
      historyApiFallback: {
        index: '/index.html',
        rewrites: [
          { from: /^\/_p\/\d+\//, to: '/index.html' }
        ]
      }
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: './index.html',
        inject: 'body'
      }),
      new CopyWebpackPlugin({
        patterns: [
          {
            from: 'public',
            to: '.',
            globOptions: {
              ignore: ['**/test-image.html']
            }
          }
        ]
      })
    ]
  };
};
