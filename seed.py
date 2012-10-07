#coding: utf-8

import json
import sqlite3

def read_data(file_name):
	with open(file_name, 'r') as f:
		return json.loads(f.read())

def insert_cities(cursor, cities):
	for city in cities:
		cursor.execute(u'INSERT INTO cities(name) VALUES ("{0}")'.format(city['name']))
		cursor.execute('SELECT last_insert_rowid()');
		city_id = cursor.fetchone()[0]
		for street in city['streets']:
			sql = u'INSERT INTO streets(id, name, city_id) VALUES ({0}, "{1}", {2})'
			cursor.execute(
				sql.format(street['id'], street['name'], city_id))
			
def insert_persons(cursor, persons):
	for person in persons:
		sql = u'''
			INSERT INTO people(
				first_name,
				last_name,
				second_name,
				phone_number,
				street_id
			) VALUES ("{0}", "{1}", "{2}", "{3}", {4})'''
		cursor.execute(sql.format(
			person['firstName'],
			person['lastName'],
			person['secondName'],
			person['phoneNumber'],
			person['streetId']))


if __name__ == '__main__':
	fixtures = read_data('fixtures.json')
	conn = sqlite3.connect('telbase.db')
	cursor = conn.cursor()

	insert_cities(cursor, fixtures['cities'])
	insert_persons(cursor, fixtures['persons'])

	conn.commit()
	conn.close()
