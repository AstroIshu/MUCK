-- Create user and grant privileges
CREATE USER IF NOT EXISTS 'muck'@'%' IDENTIFIED BY 'muckpassword';
GRANT ALL PRIVILEGES ON muck.* TO 'muck'@'%';
GRANT ALL PRIVILEGES ON *.* TO 'muck'@'%';
FLUSH PRIVILEGES;