<?php

class Contact extends ActiveRecord\Model {
	static $validates_presence_of = array(
		array('first_name', 'message' => 'не может быть пустым'),
		array('last_name', 'message' => 'не может быть пустым'),
		array('phone_number', 'message' => 'не может быть пустым'),
	);

	static $validates_numericality_of = array(
		array('phone_number', 'only_integer' => true, 'message' => 'ожет содержать только цифры')
	);
}

?>
