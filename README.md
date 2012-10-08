## PhoneBase

Данный проект представляет собой онлайновую реализацию телефонного справочника. Серверная часть написана на php с использованием легковесного фреймворка [slim](http://www.slimframework.com/). В качестве СУБД, дабы "не стрелять из пушки по мухам", была выбрана sqlite. Так же используется [php-реализация популярной ORM activerecord](http://www.phpactiverecord.org). Для удобства использования библиотек используется менеждер зависимостей [composer](http://getcomposer.org/).


Клиентская часть реализована с применением паттерна MVC посредством фреймворка [spinejs](http://spinejs.com). Код написан на JavaScript'е.

### Использование

Создание БД:

        sqlite3.exe telbase.db < db.sql
        
Заполнение БД фиктивными данными (python2.7):

        python seed.py
        
Установка php-библиотек:

        php composer.phar install
        

Примерная конфигурация vitrualhost для apache:

        <VirtualHost *:80>
            ServerAdmin admin@gmail.com
            DocumentRoot "C:/Dropbox/dev/php/telbase"
            ServerName telbase
            ServerAlias www.telbase.ru
            <Directory "C:/Dropbox/dev/php/telbase">
                AllowOverride All
                Order allow,deny
                Allow from all
            </Directory>
        </VirtualHost>
