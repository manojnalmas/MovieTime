import pymysql

# Django expects a newer mysqlclient version number, so we set it manually
pymysql.version_info = (2, 2, 1, "final", 0)
pymysql.install_as_MySQLdb()