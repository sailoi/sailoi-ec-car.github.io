import os

MAX_FILE_SIZE = 500000  # .5MB


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
