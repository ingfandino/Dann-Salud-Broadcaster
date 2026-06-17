module.exports = {
  apps: [
    {
      name: 'dann-salud-backend',
      script: './src/server.js',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 5000
      },
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s'
    },
    {
      name: 'affiliate-check-arca-worker',
      script: './src/workers/affiliate-check-arca-worker.js',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PM2_PROCESS_NAME: 'affiliate-check-arca-worker',
        AFFILIATE_CHECK_ARCA_WORKER_ENABLED: 'true'
      },
      error_file: './logs/affiliate-check-arca-err.log',
      out_file: './logs/affiliate-check-arca-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s'
    },
    {
      name: 'affiliate-check-dateas-worker',
      script: './src/workers/affiliate-check-dateas-worker.js',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PM2_PROCESS_NAME: 'affiliate-check-dateas-worker',
        AFFILIATE_CHECK_DATEAS_WORKER_ENABLED: 'true'
      },
      error_file: './logs/affiliate-check-dateas-err.log',
      out_file: './logs/affiliate-check-dateas-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s'
    },
    {
      name: 'affiliate-check-padron-worker',
      script: './src/workers/affiliate-check-padron-worker.js',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PM2_PROCESS_NAME: 'affiliate-check-padron-worker',
        AFFILIATE_CHECK_PADRON_WORKER_ENABLED: 'true'
      },
      error_file: './logs/affiliate-check-padron-err.log',
      out_file: './logs/affiliate-check-padron-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s'
    },
    {
      name: 'affiliate-check-finalizer-worker',
      script: './src/workers/affiliate-check-finalizer-worker.js',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PM2_PROCESS_NAME: 'affiliate-check-finalizer-worker',
        AFFILIATE_CHECK_FINALIZER_WORKER_ENABLED: 'true'
      },
      error_file: './logs/affiliate-check-finalizer-err.log',
      out_file: './logs/affiliate-check-finalizer-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s'
    }
  ]
};
