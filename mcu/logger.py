import os

MAX_FILE_SIZE = 500000  # .5MB
LOG_FILE = 'rc-car-logs.log'

def file_exists(filename):
    try:
        with open(filename):
            pass
        return True
    except OSError:
        return False


def rotate_log_file(log_file_name):
    if file_exists(log_file_name):
        if os.stat(log_file_name)[6] > MAX_FILE_SIZE:
            backup_file = log_file_name + '.bak'
            # remove the old backup
            os.remove(backup_file)

            # rotate the current log file over
            with open(log_file_name, 'w') as f:
                f.write('Log file rotated.\n')


class Logger:
    _path = None
    _file = None

    def __init__(self) -> None:
        print('logger init')
        super().__init__()


    def open_log_file(self, path):
        """
        Write to initial log file
        """
        rotate_log_file(path)

        self._path = path
        self.print('opening log file: ' + self._path)
        self._file = open(self._path, 'w')
        self.print('logger log file opened')


    def print(self, *args):
        message = ''
        for x in args:
            message += str(x) + ' '

        if self._file:
            print(message)  # Also print so can be seen when debugging using serial connection
            self._file.write(message + '\n')
            self._file.flush()  # We want our logs to be written immediately
        else:
            print('No log file yet, msg: ', message)


_logger = Logger()
_logger.open_log_file(LOG_FILE)

def get_logger():
    if not _logger:
        raise Exception('logger not yet set')
    return _logger
