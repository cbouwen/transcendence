# settings.py
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
        },
    },
    'loggers': {
        'tetris': {  # Replace 'tetris' with your app name if different
            'handlers': ['console'],
            'level': 'INFO',
        },
    },
}
