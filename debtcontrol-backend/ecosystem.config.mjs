export default {
  apps: [
    {
      name: 'debtcontrol-backend',
      script: 'dist/index.js',
      cwd: '/opt/debtcontrol/backend',
      instances: 1,
      exec_mode: 'cluster',
      wait_ready: true,
      listen_timeout: 10000,
      kill_timeout: 5000,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      error_file: '/var/log/debtcontrol/error.log',
      out_file: '/var/log/debtcontrol/out.log',
      log_file: '/var/log/debtcontrol/combined.log',
      time: true,
      rotate: {
        max_size: '10M',
        retain: 5,
        compress: true,
      },
      autorestart: true,
      restart_delay: 4000,
    },
  ],
};