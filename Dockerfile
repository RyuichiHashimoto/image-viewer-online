FROM php:8.3-apache
RUN mkdir -p /var/db && chown www-data:www-data /var/db
